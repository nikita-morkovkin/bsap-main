import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { StateManagerService } from '../state/state-manager.service';
import { VideoJobService } from './video-job.service';
import { VideoLibraryService } from './video-library.service';

const TICK_MS = 10_000;

/**
 * Hands-free montage: once the user's clips are uploaded AND the final audio is
 * mastered, starts the normal "build" job (normalize -> plan -> render -> mux).
 * Polling (instead of calling from the audio module) avoids a module cycle and
 * survives API restarts.
 */
@Injectable()
export class AutoMontageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoMontageService.name);
  private timer?: NodeJS.Timeout;
  private ticking = false;

  constructor(
    private readonly state: StateManagerService,
    private readonly jobs: VideoJobService,
    private readonly library: VideoLibraryService,
  ) {}

  public onModuleInit(): void {
    this.timer = setInterval(() => {
      // A rejected tick must never become an unhandled rejection: on Node 22 that terminates the API.
      this.tick().catch((error: unknown) =>
        this.logger.error(`Auto montage tick failed: ${String(error)}`),
      );
    }, TICK_MS);
  }

  public onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** Called by the frontend when the post-creation clip upload has finished. */
  public async markUploaded(projectId: string, uploaded: number) {
    const clips = (await this.library.list(projectId)).filter(
      (clip) => clip.enabled && clip.status === 'ready',
    );

    return this.state.updateState(projectId, (current) => {
      const auto = current.video?.autoMontage;

      if (!auto || auto.status !== 'uploading') {
        throw new ConflictException('Auto montage is not waiting for clips');
      }

      if (!clips.length) {
        auto.status = 'failed';
        auto.error = 'No valid stock clips were uploaded';
      } else {
        auto.status = 'pending';
        auto.uploaded = uploaded;
        delete auto.error;
      }
    });
  }

  public async tick(): Promise<void> {
    if (this.ticking) {
      return;
    }

    this.ticking = true;

    try {
      // A project may be mid-write when listed; skip this tick instead of failing.
      const projects = await this.state.listProjects();

      for (const project of projects) {
        const auto = project.video?.autoMontage;

        if (auto?.status === 'pending' || auto?.status === 'rendering') {
          await this.advance(project.projectId).catch((error: unknown) =>
            this.logger.error(`${project.projectId}: ${String(error)}`),
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Auto montage skipped this tick: ${String(error)}`);
    } finally {
      this.ticking = false;
    }
  }

  private async advance(projectId: string): Promise<void> {
    const project = await this.state.getState(projectId);
    const auto = project.video?.autoMontage;

    if (auto?.status === 'pending') {
      const audioReady =
        project.status === 'COMPLETED' &&
        !project.mixNeedsRebuild &&
        Boolean(project.outputFiles.wav);

      if (!audioReady) {
        return;
      }

      try {
        const job = await this.jobs.start(projectId, 'build');

        await this.state.updateState(projectId, (current) => {
          if (current.video?.autoMontage) {
            current.video.autoMontage.status = 'rendering';
            current.video.autoMontage.jobId = job.jobId;
          }
        });
      } catch (error) {
        if (error instanceof ConflictException) {
          return; // another video job is active; retry next tick
        }

        await this.finish(projectId, 'failed', String(error));
      }

      return;
    }

    const job = project.video?.job;

    if (!job || job.jobId !== auto?.jobId) {
      // A manually started job superseded ours; trust its final output if any.
      if (project.video?.output) {
        await this.finish(projectId, 'done');
      } else {
        await this.finish(projectId, 'failed', 'The montage job was replaced');
      }
    } else if (job.stage === 'done') {
      await this.finish(projectId, 'done');
    } else if (job.stage === 'failed' || job.stage === 'cancelled') {
      await this.finish(projectId, 'failed', job.error ?? `Job ${job.stage}`);
    }
  }

  private async finish(
    projectId: string,
    status: 'done' | 'failed',
    error?: string,
  ): Promise<void> {
    await this.state.updateState(projectId, (current) => {
      const auto = current.video?.autoMontage;

      if (auto) {
        auto.status = status;

        if (error) {
          auto.error = error.slice(-2000);
        } else {
          delete auto.error;
        }
      }
    });
  }
}
