import Input from '@/components/ui/Input'
import {
  useAppSettings,
  useUpdateAppSettings,
} from '@/hooks/queries/useAppSettings.hook'
import type { ChangeEvent } from 'react'
import type {
  AppSettings,
  KokoroDevice,
  SettingsOption,
  TtsProvider,
} from '@/types/settings.types'
import LumeanKeySection from './LumeanKeySection'
import PolzaKeySection from './PolzaKeySection'

const providers: SettingsOption<TtsProvider>[] = [
  {
    value: 'kokoro',
    label: 'Kokoro (local)',
    help: 'Runs on your server. Free, no key needed.',
  },
  {
    value: 'lumean',
    label: 'Lumean',
    help: 'Cloud voices through the Lumean API. Each chunk is a separate order, so narration is slower. Needs an API key.',
  },
]

const devices: SettingsOption<KokoroDevice>[] = [
  {
    value: 'gpu',
    label: 'GPU (NVIDIA)',
    help: 'Default. Faster synthesis. Needs an NVIDIA GPU and NVIDIA Container Toolkit.',
  },
  {
    value: 'cpu',
    label: 'CPU',
    help: 'Works on any machine, slower synthesis.',
  },
]

const radioClass = 'flex items-start gap-3 rounded-xl border p-4'
const emptySettings: AppSettings = {
  ttsProvider: 'kokoro',
  kokoroDevice: 'gpu',
  lumeanService: 'elevenlabs',
  lumeanApiKeySet: false,
  lumeanApiKeyHint: null,
  polzaApiKeySet: false,
  polzaApiKeyHint: null,
  polzaApiKeyAvailable: false,
}

const SettingsView = () => {
  const query = useAppSettings()
  const mutation = useUpdateAppSettings()
  const settings: AppSettings | undefined = query.data
  const publicSettings = settings ?? emptySettings
  const busy = query.isPending || mutation.isPending

  const handleProviderChange = (event: ChangeEvent<HTMLInputElement>) => {
    mutation.mutate({ ttsProvider: event.currentTarget.value as TtsProvider })
  }

  const handleDeviceChange = (event: ChangeEvent<HTMLInputElement>) => {
    mutation.mutate({ kokoroDevice: event.currentTarget.value as KokoroDevice })
  }

  const handleLumeanServiceChange = (value: 'elevenlabs' | 'cartesia') => {
    mutation.mutate({ lumeanService: value })
  }

  const handleRetry = () => {
    query.refetch()
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <fieldset className="space-y-4 rounded-2xl border p-5" disabled={busy}>
        <legend className="px-2 text-lg font-semibold">
          Narration provider
        </legend>
        {providers.map((provider) => (
          <label key={provider.value} className={radioClass}>
            <Input
              type="radio"
              name="tts-provider"
              value={provider.value}
              checked={settings?.ttsProvider === provider.value}
              onChange={handleProviderChange}
              className="mt-1 size-4"
            />
            <span>
              <span className="block font-medium">{provider.label}</span>
              <span className="block text-sm text-muted-foreground">
                {provider.help}
              </span>
            </span>
          </label>
        ))}
        <p className="text-sm text-muted-foreground">
          Changing the provider changes the voice list. A project keeps its
          saved voice, so pick a voice from the new list before creating an
          episode.
        </p>
      </fieldset>

      {settings?.ttsProvider === 'kokoro' && (
        <fieldset className="space-y-4 rounded-2xl border p-5" disabled={busy}>
          <legend className="px-2 text-lg font-semibold">Kokoro device</legend>
          {devices.map((device) => (
            <label key={device.value} className={radioClass}>
              <Input
                type="radio"
                name="kokoro-device"
                value={device.value}
                checked={settings.kokoroDevice === device.value}
                onChange={handleDeviceChange}
                className="mt-1 size-4"
              />
              <span>
                <span className="block font-medium">{device.label}</span>
                <span className="block text-sm text-muted-foreground">
                  {device.help}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {settings?.ttsProvider === 'lumean' && (
        <LumeanKeySection
          disabled={busy}
          keyIsSaved={settings.lumeanApiKeySet}
          keyHint={settings.lumeanApiKeyHint}
          service={settings.lumeanService}
          onServiceChange={handleLumeanServiceChange}
        />
      )}

      <PolzaKeySection
        disabled={busy}
        keyIsSaved={publicSettings.polzaApiKeySet}
        keyHint={publicSettings.polzaApiKeyHint}
        keyIsAvailable={publicSettings.polzaApiKeyAvailable}
      />

      {query.isError && (
        <p role="alert" className="text-destructive">
          Could not load settings.{' '}
          <button type="button" className="underline" onClick={handleRetry}>
            Retry
          </button>
        </p>
      )}
    </section>
  )
}

export default SettingsView
