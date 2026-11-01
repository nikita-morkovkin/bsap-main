import { ConfigService } from '@nestjs/config';
import type { AppSettingsService } from '../../app-settings/app-settings.service';
import { CatalogService } from '../catalog.service';

describe('Provider settings catalogs', () => {
  const config = new ConfigService({
    POLZA_API_URL: 'http://polza/v1/',
    POLZA_API_KEY: 'test-key',
    KOKORO_TTS_URL: 'http://kokoro/',
    KOKORO_GPU_TTS_URL: 'http://kokoro-gpu:8880/',
    LUMEAN_API_URL: 'https://lumean.test/api/public/',
  });
  const settings = (
    kokoroDevice: 'cpu' | 'gpu' = 'cpu',
    polzaApiKey?: string,
  ) =>
    ({
      get: () => Promise.resolve({ kokoroDevice }),
      getEffectivePolzaApiKey: (environmentKey?: string) =>
        Promise.resolve(polzaApiKey ?? environmentKey),
    }) as AppSettingsService;
  afterEach(() => jest.restoreAllMocks());

  it('returns chat models with model-level and provider-level reasoning metadata', async () => {
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(
      Response.json({
        data: [
          {
            id: 'model-a',
            name: 'Model A',
            type: 'chat',
            reasoning: {
              mandatory: true,
              supported_efforts: ['max', 'high'],
              default_effort: 'max',
            },
          },
          {
            id: 'model-b',
            type: 'chat',
            top_provider: {
              supported_parameters: ['reasoning_effort'],
              reasoning: { supported_efforts: ['none', 'low'] },
            },
          },
          { id: 'image', type: 'image' },
          { id: 'plain', type: 'chat' },
        ],
      }),
    );
    const models = await new CatalogService(config, settings()).getModels();
    expect(fetcher).toHaveBeenCalledWith(
      'http://polza/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-key' },
      }),
    );
    expect(models).toHaveLength(3);
    expect(models[0].reasoning).toMatchObject({
      mandatory: true,
      supportedEfforts: ['max', 'high'],
      defaultEffort: 'max',
    });
    expect(models[1].reasoning.supportedEfforts).toEqual(['none', 'low']);
    expect(models[2].reasoning.supportedEfforts).toEqual([]);
  });

  it('prefers the saved Polza key and observes its replacement and removal', async () => {
    let savedKey: string | undefined = 'saved-catalog-key';
    const appSettings = {
      getEffectivePolzaApiKey: (environmentKey?: string) =>
        Promise.resolve(savedKey ?? environmentKey),
    } as AppSettingsService;
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(Response.json({ data: [{ id: 'model-a' }] })),
      );
    const catalog = new CatalogService(config, appSettings);

    await catalog.getModels();
    savedKey = 'replacement-catalog-key';
    await catalog.getModels();
    savedKey = undefined;
    await catalog.getModels();

    expect(fetcher.mock.calls.map((call) => call[1]?.headers)).toEqual([
      { Authorization: 'Bearer saved-catalog-key' },
      { Authorization: 'Bearer replacement-catalog-key' },
      { Authorization: 'Bearer test-key' },
    ]);
  });

  it('fails with an actionable error when no Polza key is configured', async () => {
    const noFallbackConfig = new ConfigService({
      POLZA_API_URL: 'http://polza/v1',
    });
    const appSettings = {
      getEffectivePolzaApiKey: () => Promise.resolve(undefined),
    } as AppSettingsService;
    const fetcher = jest.spyOn(global, 'fetch');

    await expect(
      new CatalogService(noFallbackConfig, appSettings).getModels(),
    ).rejects.toThrow('Add one in Settings');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { voices: ['bm_george', 'bm_lewis'] },
    { voices: [{ id: 'bm_george', name: 'George' }, { id: 'bm_lewis' }] },
  ])(
    'supports legacy and current Kokoro voice catalog shapes',
    async (payload) => {
      jest.spyOn(global, 'fetch').mockResolvedValue(Response.json(payload));
      const voices = await new CatalogService(config, settings()).getVoices();
      expect(voices.map((voice) => voice.id)).toEqual([
        'bm_george',
        'bm_lewis',
      ]);
    },
  );

  it('uses the GPU Kokoro URL when GPU is selected in app settings', async () => {
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(Response.json({ voices: ['af_heart'] }));

    await new CatalogService(config, settings('gpu')).getVoices();

    expect(fetcher).toHaveBeenCalledWith(
      'http://kokoro-gpu:8880/v1/audio/voices',
      expect.any(Object),
    );
  });

  it('parses the documented Lumean Cartesia catalog response', async () => {
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(
      Response.json({
        success: true,
        message: 'Success',
        data: {
          items: [
            {
              id: 123,
              voice_id: 'cartesia-voice-1',
              name: 'Calm Narrator',
              description: null,
              language: 'en',
              gender: 'feminine',
              preview_url: null,
            },
          ],
          current_page: 1,
          last_page: 1,
          per_page: 100,
          total: 1,
        },
      }),
    );

    const voices = await new CatalogService(config, settings()).getLumeanVoices(
      'cartesia',
      'lumean-test-key',
    );

    expect(fetcher).toHaveBeenCalledWith(
      'https://lumean.test/api/public/voices/cartesia?page=1&per_page=100',
      expect.objectContaining({
        headers: { 'X-API-KEY': 'lumean-test-key' },
      }),
    );
    expect(voices).toEqual([{ id: 'cartesia-voice-1', name: 'Calm Narrator' }]);
  });

  it('handles ElevenLabs voice IDs and skips catalog-only numeric IDs', async () => {
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(
      Response.json({
        data: {
          voices: [
            { voice_id: 'eleven-1', name: 'Narrator' },
            { id: 'eleven-2', display_name: 'Reader' },
            { id: 123, name: 'Missing voice ID' },
          ],
        },
      }),
    );

    await expect(
      new CatalogService(config, settings()).getLumeanVoices(
        'elevenlabs',
        'lumean-test-key',
      ),
    ).resolves.toEqual([
      { id: 'eleven-1', name: 'Narrator' },
      { id: 'eleven-2', name: 'Reader' },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      'https://lumean.test/api/public/voices/elevenlabs/library?page=0&page_size=50',
      expect.objectContaining({
        headers: { 'X-API-KEY': 'lumean-test-key' },
      }),
    );
  });

  it('includes safe field paths when a Lumean catalog response is invalid', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      Response.json({
        success: true,
        message: 'Success',
        data: { items: 'invalid' },
      }),
    );

    await expect(
      new CatalogService(config, settings()).getLumeanVoices(
        'cartesia',
        'lumean-test-key',
      ),
    ).rejects.toThrow('Invalid Lumean voice catalog response');
  });

  it('reports upstream outages as service unavailable', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('down', { status: 503 }));
    await expect(
      new CatalogService(config, settings()).getVoices(),
    ).rejects.toMatchObject({ status: 503 });
  });
});
