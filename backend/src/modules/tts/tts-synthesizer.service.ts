import { Injectable } from '@nestjs/common';
import { AppSettingsService } from '../app-settings/app-settings.service';
import type { Profile } from '../state/types/profile.type';
import type { ITtsAdapter } from '../state/types/tts.type';
import { KokoroTtsAdapter } from './kokoro-tts.adapter';
import { LumeanTtsAdapter } from './lumean-tts.adapter';

/** Routes each synthesis call to the provider chosen in Settings. */
@Injectable()
export class TtsSynthesizerService implements ITtsAdapter {
  constructor(
    private readonly appSettings: AppSettingsService,
    private readonly kokoro: KokoroTtsAdapter,
    private readonly lumean: LumeanTtsAdapter,
  ) {}

  public async synthesize(
    text: string,
    outputPath: string,
    profile: Profile,
  ): Promise<void> {
    const { ttsProvider } = await this.appSettings.get();
    const adapter = ttsProvider === 'lumean' ? this.lumean : this.kokoro;

    return adapter.synthesize(text, outputPath, profile);
  }
}
