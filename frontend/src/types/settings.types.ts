export type ModelOption = {
  id: string
  name: string
  supportedParameters: string[]
  reasoning: {
    mandatory: boolean
    defaultEnabled: boolean
    supportedEfforts: string[]
    defaultEffort: string | null
  }
}
export type VoiceOption = { id: string; name: string }
export type KokoroDevice = 'cpu' | 'gpu'
export type TtsProvider = 'kokoro' | 'lumean'
export type LumeanService = 'elevenlabs' | 'cartesia'
export type SettingsOption<T extends string> = {
  value: T
  label: string
  help?: string
}

export type AppSettings = {
  ttsProvider: TtsProvider
  kokoroDevice: KokoroDevice
  lumeanService: LumeanService
  lumeanApiKeySet: boolean
  lumeanApiKeyHint: string | null
  polzaApiKeySet: boolean
  polzaApiKeyHint: string | null
  polzaApiKeyAvailable: boolean
}

/** A null credential clears that saved key. */
export type AppSettingsPatch = Partial<
  Omit<
    AppSettings,
    | 'lumeanApiKeySet'
    | 'lumeanApiKeyHint'
    | 'polzaApiKeySet'
    | 'polzaApiKeyHint'
    | 'polzaApiKeyAvailable'
  >
> & {
  lumeanApiKey?: string | null
  polzaApiKey?: string | null
}
