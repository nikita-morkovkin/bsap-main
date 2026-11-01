import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { writeArtifact } from '../../utils/write-artifact.util';
import { StateManagerService } from '../state/state-manager.service';
import {
  appSettingsPatchSchema,
  appSettingsSchema,
  type AppSettings,
  type AppSettingsPatch,
  type PublicAppSettings,
} from './app-settings.schema';

const FILE_NAME = '_app-settings.json';

/** Application-wide settings, stored next to the projects (not inside any project). */
@Injectable()
export class AppSettingsService {
  constructor(private readonly state: StateManagerService) {}

  /** Full settings including the API key. Server-side use only. */
  public async get(): Promise<AppSettings> {
    try {
      return appSettingsSchema.parse(
        JSON.parse(await fs.readFile(this.path(), 'utf8')),
      );
    } catch {
      return appSettingsSchema.parse({});
    }
  }

  public async getPublic(): Promise<PublicAppSettings> {
    return this.toPublic(await this.get());
  }

  public async update(patch: unknown): Promise<PublicAppSettings> {
    const parsed: AppSettingsPatch = appSettingsPatchSchema.parse(patch);
    const current = await this.get();
    const next = { ...current, ...parsed };

    if (parsed.lumeanApiKey === null) {
      delete next.lumeanApiKey;
    }

    const stored = appSettingsSchema.parse(next);

    await fs.mkdir(this.state.getProjectsDirectory(), { recursive: true });
    await writeArtifact(this.path(), JSON.stringify(stored, null, 2));

    return this.toPublic(stored);
  }

  private toPublic(settings: AppSettings): PublicAppSettings {
    const key = settings.lumeanApiKey;

    return {
      ttsProvider: settings.ttsProvider,
      kokoroDevice: settings.kokoroDevice,
      lumeanService: settings.lumeanService,
      lumeanApiKeySet: Boolean(key),
      lumeanApiKeyHint: key ? `…${key.slice(-4)}` : null,
    };
  }

  private path(): string {
    return join(this.state.getProjectsDirectory(), FILE_NAME);
  }
}
