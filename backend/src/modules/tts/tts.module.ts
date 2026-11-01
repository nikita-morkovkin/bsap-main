import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PIPELINE_JOBS } from '../queue/consts/pipeline-jobs.const';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { StateModule } from '../state/state.module';
import { AudioProbeService } from './audio-probe.service';
import { ChapterAssemblyQueueService } from './chapter-assembly-queue.service';
import { KokoroTtsAdapter } from './kokoro-tts.adapter';
import { LumeanTtsAdapter } from './lumean-tts.adapter';
import { TtsSynthesizerService } from './tts-synthesizer.service';
import { TtsProcessor } from './tts.processor';

@Module({
  imports: [
    ConfigModule,
    StateModule,
    AppSettingsModule,
    BullModule.registerQueue(
      { name: PIPELINE_JOBS.ttsQueue },
      { name: PIPELINE_JOBS.audioMasteringQueue },
    ),
  ],
  providers: [
    KokoroTtsAdapter,
    LumeanTtsAdapter,
    TtsSynthesizerService,
    AudioProbeService,
    ChapterAssemblyQueueService,
    TtsProcessor,
  ],
  exports: [
    KokoroTtsAdapter,
    TtsSynthesizerService,
    AudioProbeService,
    ChapterAssemblyQueueService,
  ],
})
export class TtsModule {}
