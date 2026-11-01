export type ModelOption = {
  id: string;
  name: string;
  supportedParameters: string[];
  reasoning: {
    mandatory: boolean;
    defaultEnabled: boolean;
    supportedEfforts: string[];
    defaultEffort: string | null;
  };
};
export type VoiceOption = { id: string; name: string };
export type KokoroDevice = 'cpu' | 'gpu';
export type TtsProvider = 'kokoro' | 'lumean';
export type LumeanService = 'elevenlabs' | 'cartesia';

export type AppSettings = {
  ttsProvider: TtsProvider;
  kokoroDevice: KokoroDevice;
  lumeanService: LumeanService;
  lumeanApiKeySet: boolean;
  lumeanApiKeyHint: string | null;
};

/** `lumeanApiKey: null` clears the stored key. */
export type AppSettingsPatch = Partial<Omit<AppSettings, 'lumeanApiKeySet' | 'lumeanApiKeyHint'>> & {
  lumeanApiKey?: string | null;
};
