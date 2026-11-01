import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { AppSettingsService } from '../app-settings/app-settings.service';
import type { LumeanService } from '../app-settings/app-settings.schema';
import { voiceIdSchema } from '../state/schemas/voice-id.schema';
import type { Profile } from '../state/types/profile.type';
import type { ITtsAdapter } from '../state/types/tts.type';
import { writeAudioResponse } from './utils/write-audio-response.util';

const TERMINAL_OK = ['completed', 'result_delivered'];
const TERMINAL_FAIL = [
  'failed',
  'compensated',
  'cancelled',
  'partially_completed',
];
const POLL_MS = 3000;

/** Speed ranges documented by Lumean per service. */
const SPEED: Record<LumeanService, [number, number]> = {
  elevenlabs: [0.7, 1.2],
  cartesia: [0.6, 1.5],
};

const orderSchema = z.object({
  data: z.object({
    id: z.string(),
    status: z.string(),
    result: z
      .object({
        files: z.array(z.string()).default([]),
        user_message: z.string().nullish(),
      })
      .nullish(),
  }),
});
const urlSchema = z.object({ data: z.object({ url: z.string().url() }) });
const templateSchema = z.object({ data: z.object({ id: z.string() }) });
const orderCreatedSchema = z.object({ data: z.object({ id: z.string() }) });

/**
 * Lumean API: TTS is order-based. A template holds the voice; each chunk becomes
 * an order that is polled until it has a result file, then downloaded via a
 * temporary storage URL.
 */
@Injectable()
export class LumeanTtsAdapter implements ITtsAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly templates = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly appSettings: AppSettingsService,
  ) {
    this.baseUrl = (
      this.configService.get<string>('LUMEAN_API_URL') ??
      'https://api.lumean.app/api/public'
    ).replace(/\/+$/, '');
    this.timeoutMs = Number(
      this.configService.get('LUMEAN_TIMEOUT_MS') ?? 600000,
    );
  }

  public async synthesize(
    text: string,
    outputPath: string,
    profile: Profile,
  ): Promise<void> {
    const settings = await this.appSettings.get();

    if (!settings.lumeanApiKey) {
      throw new Error('Lumean API key is not set. Add it in Settings.');
    }

    const key = settings.lumeanApiKey;
    const service = settings.lumeanService;
    const voice = voiceIdSchema.parse(profile.ttsVoice);
    const [min, max] = SPEED[service];
    const speed = Math.min(max, Math.max(min, profile.ttsSpeed));
    const signal = AbortSignal.timeout(this.timeoutMs);

    const templateId = await this.template(key, service, voice, speed, signal);
    const orderId = await this.createOrder(key, templateId, text, signal);
    const files = await this.waitForFiles(key, orderId, signal);

    const download = await this.request(key, '/storage/url', {
      method: 'POST',
      body: { path: files[0], download: false },
      signal,
    });
    const { data } = urlSchema.parse(await download.json());
    const audio = await fetch(data.url, { signal }).catch((error: unknown) => {
      throw new Error(`Lumean audio download failed: ${String(error)}`);
    });

    if (!audio.ok) {
      await audio.body?.cancel();

      throw new Error(`Lumean audio download failed: HTTP ${audio.status}`);
    }

    await writeAudioResponse(audio, outputPath, signal);
  }

  private async template(
    key: string,
    service: LumeanService,
    voice: string,
    speed: number,
    signal: AbortSignal,
  ): Promise<string> {
    const cacheKey = `${service}:${voice}:${speed}`;
    const cached = this.templates.get(cacheKey);

    if (cached) {
      return cached;
    }

    const ttsSettings =
      service === 'elevenlabs'
        ? {
            mode: 'mode_v1',
            model_id: 'eleven_multilingual_v2',
            voice_id: voice,
            advanced_voice_settings: true,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              use_speaker_boost: true,
              speed,
            },
            language_code: 'en',
          }
        : {
            model_id: 'sonic-3',
            voice_id: voice,
            language_code: 'en',
            voice_settings: { speed },
          };

    const response = await this.request(key, '/templates', {
      method: 'POST',
      body: {
        service_key: service,
        name: `bsap-${service}-${voice}-${speed}`.slice(0, 255),
        config: {
          tts_settings: ttsSettings,
          output_settings: {
            audio_format: 'wav',
            audio_quality: 'high',
            sample_rate: 44100,
          },
        },
      },
      signal,
    });
    const { data } = templateSchema.parse(await response.json());

    this.templates.set(cacheKey, data.id);

    return data.id;
  }

  private async createOrder(
    key: string,
    templateId: string,
    text: string,
    signal: AbortSignal,
  ): Promise<string> {
    const response = await this.request(key, '/orders', {
      method: 'POST',
      body: { type: 'tts', template_id: templateId, input_text: text },
      signal,
    });
    const { data } = orderCreatedSchema.parse(await response.json());

    return data.id;
  }

  private async waitForFiles(
    key: string,
    orderId: string,
    signal: AbortSignal,
  ): Promise<string[]> {
    while (true) {
      signal.throwIfAborted();

      const response = await this.request(key, `/orders/${orderId}`, {
        signal,
      });
      const { data } = orderSchema.parse(await response.json());

      if (TERMINAL_OK.includes(data.status)) {
        const files = data.result?.files ?? [];

        if (!files.length) {
          throw new Error(
            `Lumean order ${orderId} completed without an audio file`,
          );
        }

        return files;
      }

      if (TERMINAL_FAIL.includes(data.status)) {
        const reason = data.result?.user_message ?? 'no details';

        throw new Error(`Lumean order ${data.status}: ${reason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }

  private async request(
    key: string,
    path: string,
    options: { method?: string; body?: unknown; signal: AbortSignal },
  ): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'X-API-KEY': key,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const reason = detail.match(/"reason"\s*:\s*"([^"]+)"/)?.[1];

      throw new Error(
        `Lumean ${path} failed: HTTP ${response.status}${reason ? ` (${reason})` : ''}`,
      );
    }

    return response;
  }
}
