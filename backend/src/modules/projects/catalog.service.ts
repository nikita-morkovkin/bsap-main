import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { AppSettingsService } from '../app-settings/app-settings.service';

const reasoningSchema = z.object({
  mandatory: z.boolean().optional(),
  default_enabled: z.boolean().optional(),
  supported_efforts: z.array(z.string()).nullable().optional(),
  default_effort: z.string().nullable().optional(),
});
const providerSchema = z.object({
  reasoning: reasoningSchema.nullable().optional(),
  supported_parameters: z.array(z.string()).nullable().optional(),
});
const modelsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().optional(),
      type: z.string().optional(),
      reasoning: reasoningSchema.nullable().optional(),
      supported_parameters: z.array(z.string()).nullable().optional(),
      top_provider: providerSchema.nullable().optional(),
    }),
  ),
});
const lumeanVoiceSchema = z.object({
  id: z.string().optional(),
  voice_id: z.string().optional(),
  name: z.string().optional(),
  display_name: z.string().optional(),
});
const voicesSchema = z.object({
  voices: z
    .array(
      z.union([
        z.string().min(1),
        z.object({
          id: z.string().min(1),
          name: z.string().optional(),
        }),
      ]),
    )
    .min(1),
});

// ElevenLabs wraps items in `data.voices`; Cartesia in `data.items`.
const lumeanVoicesSchema = z.object({
  data: z
    .union([
      z.object({ voices: z.array(lumeanVoiceSchema) }),
      z.object({ items: z.array(lumeanVoiceSchema) }),
    ])
    .transform((value) => ('voices' in value ? value.voices : value.items)),
});

@Injectable()
export class CatalogService {
  constructor(
    private readonly config: ConfigService,
    private readonly appSettings: AppSettingsService,
  ) {}

  public async getModels() {
    const result = modelsSchema.safeParse(
      await this.getJson(
        `${this.config.getOrThrow<string>('POLZA_API_URL').replace(/\/+$/, '')}/models`,
        {
          Authorization: `Bearer ${this.config.getOrThrow<string>('POLZA_API_KEY')}`,
        },
      ),
    );
    if (!result.success)
      throw new ServiceUnavailableException(
        'Invalid Polza model catalog. Please retry.',
      );
    const payload = result.data;

    return payload.data
      .filter((model) => !model.type || model.type === 'chat')
      .map((model) => {
        const reasoning = model.reasoning ?? model.top_provider?.reasoning;
        return {
          id: model.id,
          name: model.name ?? model.id,
          supportedParameters:
            model.supported_parameters ??
            model.top_provider?.supported_parameters ??
            [],
          reasoning: {
            mandatory: reasoning?.mandatory ?? false,
            defaultEnabled: reasoning?.default_enabled ?? false,
            supportedEfforts: reasoning?.supported_efforts ?? [],
            defaultEffort: reasoning?.default_effort ?? null,
          },
        };
      });
  }

  public async getVoices() {
    const { kokoroDevice } = await this.appSettings.get();
    const baseUrl =
      kokoroDevice === 'gpu'
        ? (this.config.get<string>('KOKORO_GPU_TTS_URL') ??
          'http://kokoro-tts-gpu:8880')
        : this.config.getOrThrow<string>('KOKORO_TTS_URL');
    const result = voicesSchema.safeParse(
      await this.getJson(
        `${baseUrl.replace(/\/+$/, '')}/v1/audio/voices`,
      ),
    );
    if (!result.success)
      throw new ServiceUnavailableException(
        'Invalid Kokoro voice catalog. Please retry.',
      );
    const payload = result.data;
    return payload.voices.map((voice) =>
      typeof voice === 'string'
        ? { id: voice, name: voice }
        : { id: voice.id, name: voice.name ?? voice.id },
    );
  }

  /** Voices available through Lumean for the chosen TTS service (first page). */
  public async getLumeanVoices(
    service: 'elevenlabs' | 'cartesia',
    apiKey: string,
  ): Promise<{ id: string; name: string }[]> {
    const base = this.config
      .getOrThrow<string>('LUMEAN_API_URL')
      .replace(/\/+$/, '');
    const url =
      service === 'elevenlabs'
        ? `${base}/voices/elevenlabs/library?page=0&page_size=100`
        : `${base}/voices/cartesia?page=1&per_page=100`;
    const response = await fetch(url, {
      headers: { 'X-API-KEY': apiKey },
      signal: AbortSignal.timeout(15000),
    }).catch(() => null);

    if (response?.status === 401 || response?.status === 403) {
      await response.body?.cancel();
      throw new BadRequestException(
        'Lumean rejected the API key. Check it in Settings.',
      );
    }

    if (!response?.ok) {
      await response?.body?.cancel();
      throw new ServiceUnavailableException(
        'Lumean voice catalog unavailable. Please retry.',
      );
    }

    const payload: unknown = await response.json().catch(() => null);
    const list = lumeanVoicesSchema.safeParse(payload);

    if (!list.success) {
      throw new ServiceUnavailableException(
        'Invalid Lumean voice catalog. Please retry.',
      );
    }

    return list.data.data.flatMap((voice) => {
      const id = voice.voice_id ?? voice.id;

      return id ? [{ id, name: voice.name ?? voice.display_name ?? id }] : [];
    });
  }

  private async getJson(
    url: string,
    headers?: Record<string, string>,
  ): Promise<unknown> {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch {
      throw new ServiceUnavailableException(
        'Provider catalog unavailable. Please retry.',
      );
    }
  }
}
