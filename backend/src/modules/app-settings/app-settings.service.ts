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

  public async getPublic(
    environmentPolzaApiKey?: string,
  ): Promise<PublicAppSettings> {
    return this.toPublic(await this.get(), environmentPolzaApiKey);
  }

  public async update(
    patch: unknown,
    environmentPolzaApiKey?: string,
  ): Promise<PublicAppSettings> {
    const parsed: AppSettingsPatch = appSettingsPatchSchema.parse(patch);
    const current = await this.get();
    const next = { ...current, ...parsed };

    if (parsed.lumeanApiKey === null) {
      delete next.lumeanApiKey;
    }

    if (parsed.polzaApiKey === null) {
      delete next.polzaApiKey;
    }

    const stored = appSettingsSchema.parse(next);

    await fs.mkdir(this.state.getProjectsDirectory(), { recursive: true });
    await writeArtifact(this.path(), JSON.stringify(stored, null, 2));

    return this.toPublic(stored, environmentPolzaApiKey);
  }

  /** Prefer a Settings credential; use the environment key only as a fallback. */
  public async getEffectivePolzaApiKey(
    environmentPolzaApiKey?: string,
  ): Promise<string | undefined> {
    const settings = await this.get();

    return (
      settings.polzaApiKey ?? (environmentPolzaApiKey?.trim() || undefined)
    );
  }

  private toPublic(
    settings: AppSettings,
    environmentPolzaApiKey?: string,
  ): PublicAppSettings {
    const lumeanKey = settings.lumeanApiKey;
    const polzaKey = settings.polzaApiKey;

    return {
      ttsProvider: settings.ttsProvider,
      kokoroDevice: settings.kokoroDevice,
      lumeanService: settings.lumeanService,
      lumeanApiKeySet: Boolean(lumeanKey),
      lumeanApiKeyHint: lumeanKey ? `…${lumeanKey.slice(-4)}` : null,
      polzaApiKeySet: Boolean(polzaKey),
      polzaApiKeyHint: polzaKey ? `…${polzaKey.slice(-4)}` : null,
      polzaApiKeyAvailable: Boolean(polzaKey || environmentPolzaApiKey?.trim()),
    };
  }

  private path(): string {
    return join(this.state.getProjectsDirectory(), FILE_NAME);
  }
}
