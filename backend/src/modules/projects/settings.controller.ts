import { BadRequestException, Controller, Get } from '@nestjs/common';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { CatalogService } from './catalog.service';

@Controller('api/settings')
export class SettingsController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly appSettings: AppSettingsService,
  ) {}

  @Get('models')
  public getModels() {
    return this.catalog.getModels();
  }

  /** Voices of the TTS provider currently selected in Settings. */
  @Get('voices')
  public async getVoices() {
    const settings = await this.appSettings.get();

    if (settings.ttsProvider === 'kokoro') {
      return this.catalog.getVoices();
    }

    if (!settings.lumeanApiKey) {
      throw new BadRequestException(
        'Add a Lumean API key in Settings to load voices.',
      );
    }

    return this.catalog.getLumeanVoices(
      settings.lumeanService,
      settings.lumeanApiKey,
    );
  }
}
