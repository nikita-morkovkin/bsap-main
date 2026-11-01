import { Body, Controller, Get, Put } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { AppSettingsService } from './app-settings.service';
import {
  appSettingsPatchSchema,
  type AppSettingsPatch,
  type PublicAppSettings,
} from './app-settings.schema';

@Controller('api/app-settings')
export class AppSettingsController {
  constructor(
    private readonly settings: AppSettingsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  public get(): Promise<PublicAppSettings> {
    return this.settings.getPublic(this.config.get<string>('POLZA_API_KEY'));
  }

  @Put()
  public update(
    @Body(new ZodValidationPipe(appSettingsPatchSchema))
    patch: AppSettingsPatch,
  ): Promise<PublicAppSettings> {
    return this.settings.update(
      patch,
      this.config.get<string>('POLZA_API_KEY'),
    );
  }
}
