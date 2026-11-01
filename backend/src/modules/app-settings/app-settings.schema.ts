import { z } from 'zod';

export const ttsProviderSchema = z.enum(['kokoro', 'lumean']);
export const lumeanServiceSchema = z.enum(['elevenlabs', 'cartesia']);

/** Stored in <projects>/_app-settings.json. Holds the API key, so never return it as-is. */
export const appSettingsSchema = z.strictObject({
  ttsProvider: ttsProviderSchema.default('kokoro'),
  kokoroDevice: z.enum(['cpu', 'gpu']).default('gpu'),
  lumeanService: lumeanServiceSchema.default('elevenlabs'),
  lumeanApiKey: z.string().trim().min(1).max(500).optional(),
  polzaApiKey: z.string().trim().min(1).max(500).optional(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type TtsProvider = z.infer<typeof ttsProviderSchema>;
export type LumeanService = z.infer<typeof lumeanServiceSchema>;

/** Accepts either provider key as null to clear the saved credential. */
export const appSettingsPatchSchema = z.strictObject({
  ttsProvider: ttsProviderSchema.optional(),
  kokoroDevice: z.enum(['cpu', 'gpu']).optional(),
  lumeanService: lumeanServiceSchema.optional(),
  lumeanApiKey: z.string().trim().min(1).max(500).nullable().optional(),
  polzaApiKey: z.string().trim().min(1).max(500).nullable().optional(),
});

export type AppSettingsPatch = z.infer<typeof appSettingsPatchSchema>;

/** What the API returns: the key is reduced to a presence flag and a hint. */
export type PublicAppSettings = {
  ttsProvider: TtsProvider;
  kokoroDevice: 'cpu' | 'gpu';
  lumeanService: LumeanService;
  lumeanApiKeySet: boolean;
  lumeanApiKeyHint: string | null;
  polzaApiKeySet: boolean;
  polzaApiKeyHint: string | null;
  polzaApiKeyAvailable: boolean;
};
