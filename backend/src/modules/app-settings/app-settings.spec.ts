import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppSettingsService } from './app-settings.service';

describe('AppSettingsService', () => {
  it('defaults to Kokoro on CPU and persists the choice', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'bsap-app-settings-'));
    const state = { getProjectsDirectory: () => directory } as never;
    try {
      expect(await new AppSettingsService(state).getPublic()).toMatchObject({
        ttsProvider: 'kokoro',
        kokoroDevice: 'cpu',
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
});
