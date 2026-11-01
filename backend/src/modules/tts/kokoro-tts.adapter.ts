import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { writeAudioResponse } from './utils/write-audio-response.util';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { voiceIdSchema } from '../state/schemas/voice-id.schema';
import type { Profile } from '../state/types/profile.type';
import type { ITtsAdapter } from '../state/types/tts.type';

@Injectable()
export class KokoroTtsAdapter implements ITtsAdapter {
  private readonly cpuUrl: string;
  private readonly gpuUrl: string;
  private readonly kokoroTimeoutMs: number;
  private readonly voicesCache = new Map<
    string,
    { ids: string[]; expires: number }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly appSettings: AppSettingsService,
  ) {
    this.cpuUrl = this.configService.getOrThrow<string>('KOKORO_TTS_URL');
    this.gpuUrl =
      this.configService.get<string>('KOKORO_GPU_TTS_URL') ??
      'http://kokoro-tts-gpu:8880';
    this.kokoroTimeoutMs = Number(
      this.configService.getOrThrow('KOKORO_TIMEOUT_MS'),
    );
  }

  public async synthesize(
    text: string,
    outputPath: string,
    profile: Profile,
  ): Promise<void> {
    const device = (await this.appSettings.get()).kokoroDevice;
    const baseUrl = (device === 'gpu' ? this.gpuUrl : this.cpuUrl).replace(
      /\/+$/,
      '',
    );
    const timeoutMs = this.kokoroTimeoutMs;

    const signal = AbortSignal.timeout(timeoutMs);
    const voice = voiceIdSchema.parse(profile.ttsVoice);
    let cached = this.voicesCache.get(baseUrl);

    if (!cached || cached.expires < Date.now()) {
      const catalog = await fetch(`${baseUrl}/v1/audio/voices`, {
        signal,
      }).catch((error: unknown) => {
        throw this.unreachable(device, error);
      });

      if (!catalog.ok) {
        await catalog.body?.cancel();
        throw new Error(`Kokoro voice catalog failed: HTTP ${catalog.status}`);
      }

      const payload = z
        .object({
          voices: z.array(z.union([z.string(), z.object({ id: z.string() })])),
        })
        .parse(await catalog.json());

      cached = {
        ids: payload.voices.map((entry) =>
          typeof entry === 'string' ? entry : entry.id,
        ),
        expires: Date.now() + 60000,
      };
      this.voicesCache.set(baseUrl, cached);
    }

    if (!cached.ids.includes(voice)) {
      throw new Error(
        `Kokoro voice "${voice}" is unavailable. Select a voice from the available voices list.`,
      );
    }

    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice,
        speed: profile.ttsSpeed,
        response_format: 'wav',
      }),
      signal,
    }).catch((error: unknown) => {
      throw this.unreachable(device, error);
    });

    if (!response.ok || !response.body) {
      await response.body?.cancel();

      throw new Error(`Kokoro speech request failed: HTTP ${response.status}`);
    }

    await writeAudioResponse(response, outputPath, signal);
  }

  private unreachable(device: 'cpu' | 'gpu', error: unknown): Error {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return error;
    }

    const hint =
      device === 'gpu'
        ? 'The GPU Kokoro service is not running. Start it with: docker compose up -d kokoro-tts-gpu, or switch Kokoro to CPU in Settings.'
        : 'The CPU Kokoro service is not reachable.';

    return new Error(
      `${hint} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}
