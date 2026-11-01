import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppSettingsService } from './app-settings.service';

describe('AppSettingsService', () => {
  it('defaults to Kokoro on GPU and persists the choice', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'bsap-app-settings-'));
    const state = { getProjectsDirectory: () => directory } as never;
    try {
      expect(await new AppSettingsService(state).getPublic()).toMatchObject({
        ttsProvider: 'kokoro',
        kokoroDevice: 'gpu',
        lumeanApiKeySet: false,
      });
      await new AppSettingsService(state).update({ kokoroDevice: 'gpu' });
      expect(await new AppSettingsService(state).getPublic()).toMatchObject({
        kokoroDevice: 'gpu',
      });
      await expect(
        new AppSettingsService(state).update({ kokoroDevice: 'tpu' }),
      ).rejects.toThrow();
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('stores the Lumean key but never returns it', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'bsap-app-settings-'));
    const state = { getProjectsDirectory: () => directory } as never;
    try {
      const service = new AppSettingsService(state);
      const saved = await service.update({
        ttsProvider: 'lumean',
        lumeanApiKey: 'test-key-ABCD',
      });

      expect(saved).toMatchObject({
        ttsProvider: 'lumean',
        lumeanApiKeySet: true,
        lumeanApiKeyHint: '…ABCD',
      });
      expect(JSON.stringify(saved)).not.toContain('sk-live');
      expect((await service.get()).lumeanApiKey).toBe('test-key-ABCD');

      const cleared = await service.update({ lumeanApiKey: null });
      expect(cleared).toMatchObject({
        lumeanApiKeySet: false,
        lumeanApiKeyHint: null,
      });
      expect((await service.get()).lumeanApiKey).toBeUndefined();
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('saves, replaces, preserves, masks, and removes the Polza key', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'bsap-app-settings-'));
    const state = { getProjectsDirectory: () => directory } as never;

    try {
      const service = new AppSettingsService(state);
      const first = await service.update({ polzaApiKey: 'polza-secret-1234' });

      expect(first).toMatchObject({
        polzaApiKeySet: true,
        polzaApiKeyHint: '…1234',
        polzaApiKeyAvailable: true,
      });
      expect(JSON.stringify(first)).not.toContain('polza-secret-1234');
      expect((await service.get()).polzaApiKey).toBe('polza-secret-1234');

      const replaced = await service.update({
        polzaApiKey: 'new-polza-key-5678',
      });
      expect(replaced.polzaApiKeyHint).toBe('…5678');

      await service.update({ kokoroDevice: 'gpu' });
      expect((await service.get()).polzaApiKey).toBe('new-polza-key-5678');

      const cleared = await service.update({ polzaApiKey: null });
      expect(cleared).toMatchObject({
        polzaApiKeySet: false,
        polzaApiKeyHint: null,
        polzaApiKeyAvailable: false,
      });
      expect((await service.get()).polzaApiKey).toBeUndefined();
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('marks an environment fallback as available without returning it', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'bsap-app-settings-'));
    const state = { getProjectsDirectory: () => directory } as never;

    try {
      const service = new AppSettingsService(state);
      const result = await service.getPublic('env-secret-key-9876');

      expect(result).toMatchObject({
        polzaApiKeySet: false,
        polzaApiKeyHint: null,
        polzaApiKeyAvailable: true,
      });
      expect(JSON.stringify(result)).not.toContain('env-secret-key-9876');
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
