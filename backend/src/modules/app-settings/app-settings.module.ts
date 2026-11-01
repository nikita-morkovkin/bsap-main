import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StateModule } from '../state/state.module';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';

@Module({
  imports: [ConfigModule, StateModule],
  controllers: [AppSettingsController],
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
