import { Body, Controller, Get, Put } from '@nestjs/common';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { AppSettingsService } from './app-settings.service';
import {
  appSettingsPatchSchema,
  type AppSettingsPatch,
  type PublicAppSettings,
} from './app-settings.schema';

@Controller('api/app-settings')
export class AppSettingsController {
  constructor(private readonly settings: AppSettingsService) {}

  @Get()
  public get(): Promise<PublicAppSettings> {
    return this.settings.getPublic();
  }

  @Put()
  public update(
    @Body(new ZodValidationPipe(appSettingsPatchSchema))
    patch: AppSettingsPatch,
  ): Promise<PublicAppSettings> {
    return this.settings.update(patch);
  }
}
