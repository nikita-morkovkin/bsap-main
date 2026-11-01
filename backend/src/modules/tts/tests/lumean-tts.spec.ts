import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Profile } from '../../state/types';
import { LumeanTtsAdapter } from '../lumean-tts.adapter';

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
const bodyOf = (call: unknown[]): string =>
  typeof (call[1] as RequestInit | undefined)?.body === 'string'
    ? ((call[1] as RequestInit).body as string)
    : '';
const headersOf = (call: unknown[]): Record<string, string> =>
  ((call[1] as RequestInit | undefined)?.headers ?? {}) as Record<
    string,
    string
  >;

const profile = { ttsVoice: 'voice_abc123', ttsSpeed: 0.85 } as Profile;

const settings = (lumeanApiKey?: string, lumeanService = 'elevenlabs') =>
  ({
    get: () =>
      Promise.resolve({
        ttsProvider: 'lumean' as const,
        kokoroDevice: 'cpu' as const,
        lumeanService: lumeanService as 'elevenlabs' | 'cartesia',
        lumeanApiKey,
      }),
  }) as never;

const config = new ConfigService({
  LUMEAN_API_URL: 'https://lumean.test/api',
  LUMEAN_TIMEOUT_MS: 60000,
});

describe('LumeanTtsAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates a template, an order, polls it, and downloads the WAV', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'bsap-lumean-'));
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        Response.json(
          { success: true, data: { id: 'tpl-1' } },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          { success: true, data: { id: 'ord-1', status: 'created' } },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            id: 'ord-1',
            status: 'completed',
            result: { files: ['storage/x/result.wav'] },
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { url: 'https://files.test/result.wav' } }),
      )
      .mockResolvedValueOnce(new Response('RIFF-audio'));
    const adapter = new LumeanTtsAdapter(config, settings('secret-key-1234'));
    try {
      await adapter.synthesize(
        'Soft starlight.',
        join(directory, 'out.wav'),
        profile,
      );

      expect(urlOf(fetcher.mock.calls[0][0])).toBe(
        'https://lumean.test/api/templates',
      );
      expect(headersOf(fetcher.mock.calls[0])).toMatchObject({
        'X-API-KEY': 'secret-key-1234',
      });
      const template = JSON.parse(bodyOf(fetcher.mock.calls[0])) as {
        service_key: string;
        config: {
          tts_settings: { voice_id: string; voice_settings: { speed: number } };
          output_settings: { audio_format: string };
        };
      };
      expect(template.service_key).toBe('elevenlabs');
      expect(template.config.tts_settings.voice_id).toBe('voice_abc123');
      expect(template.config.tts_settings.voice_settings.speed).toBe(0.85);
      expect(template.config.output_settings.audio_format).toBe('wav');

      expect(urlOf(fetcher.mock.calls[1][0])).toBe(
        'https://lumean.test/api/orders',
      );
      expect(JSON.parse(bodyOf(fetcher.mock.calls[1]))).toMatchObject({
        template_id: 'tpl-1',
        input_text: 'Soft starlight.',
      });
      expect(bodyOf(fetcher.mock.calls[3])).toContain('result.wav');
      expect(await fs.readFile(join(directory, 'out.wav'), 'utf8')).toBe(
        'RIFF-audio',
      );
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('reuses the template for the same voice and speed', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'bsap-lumean-'));
    const order = () =>
      Response.json({
        data: { id: 'o', status: 'completed', result: { files: ['f.wav'] } },
      });
    const fetcher = jest.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = urlOf(input);
      if (url.endsWith('/templates'))
        return Promise.resolve(
          Response.json({ data: { id: 'tpl-2' } }, { status: 201 }),
        );
      if (url.endsWith('/orders'))
        return Promise.resolve(
          Response.json({ data: { id: 'o' } }, { status: 201 }),
        );
      if (url.includes('/orders/')) return Promise.resolve(order());
      if (url.endsWith('/storage/url'))
        return Promise.resolve(
          Response.json({ data: { url: 'https://files.test/f' } }),
        );
      return Promise.resolve(new Response('audio'));
    });
    const adapter = new LumeanTtsAdapter(config, settings('k'));
    try {
      await adapter.synthesize('One.', join(directory, 'a.wav'), profile);
      await adapter.synthesize('Two.', join(directory, 'b.wav'), profile);
      const templateCalls = fetcher.mock.calls.filter(([url]) =>
        urlOf(url).endsWith('/templates'),
      );
      expect(templateCalls).toHaveLength(1);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('fails with a clear message when the key is missing', async () => {
    const fetcher = jest.spyOn(global, 'fetch');
    const adapter = new LumeanTtsAdapter(config, settings(undefined));

    await expect(
      adapter.synthesize('Hi.', '/tmp/never.wav', profile),
    ).rejects.toThrow('Add it in Settings');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('surfaces a failed order', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'bsap-lumean-'));
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        Response.json({ data: { id: 'tpl-3' } }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { id: 'o3' } }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            id: 'o3',
            status: 'failed',
            result: { user_message: 'policy' },
          },
        }),
      );
    const adapter = new LumeanTtsAdapter(config, settings('k'));
    try {
      await expect(
        adapter.synthesize('Hi.', join(directory, 'x.wav'), profile),
      ).rejects.toThrow('failed: policy');
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
