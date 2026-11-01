import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useUpdateAppSettings } from '@/hooks/queries/useAppSettings.hook'
import type { SettingsOption } from '@/types/settings.types'
import { useState, type ChangeEvent, type SyntheticEvent } from 'react'

type LumeanKeySectionProps = {
  disabled: boolean
  keyIsSaved: boolean
  keyHint: string | null
  service: 'elevenlabs' | 'cartesia'
  onServiceChange: (value: 'elevenlabs' | 'cartesia') => void
}

const services: SettingsOption<'elevenlabs' | 'cartesia'>[] = [
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'cartesia', label: 'Cartesia' },
]

const LumeanKeySection = ({
  disabled,
  keyIsSaved,
  keyHint,
  service,
  onServiceChange,
}: LumeanKeySectionProps) => {
  const [apiKey, setApiKey] = useState('')
  const mutation = useUpdateAppSettings()
  const busy = disabled || mutation.isPending

  const placeholder = keyIsSaved
    ? 'Enter a new key to replace the saved one'
    : 'Paste your Lumean API key'

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()

    const value = apiKey.trim()

    if (!value) {
      return
    }

    mutation.mutate({ lumeanApiKey: value }, { onSuccess: () => setApiKey('') })
  }

  const handleKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.currentTarget.value)
  }

  const handleServiceChange = (event: ChangeEvent<HTMLInputElement>) => {
    onServiceChange(event.currentTarget.value as 'elevenlabs' | 'cartesia')
  }

  const handleRemove = () => {
    mutation.mutate({ lumeanApiKey: null })
  }

  return (
    <fieldset className="space-y-4 rounded-2xl border p-5" disabled={busy}>
      <legend className="px-2 text-lg font-semibold">Lumean</legend>

      <div className="space-y-2">
        <p className="font-medium">Voice service</p>
        <div className="flex gap-4">
          {services.map((item) => (
            <label key={item.value} className="flex items-center gap-2">
              <Input
                type="radio"
                name="lumean-service"
                value={item.value}
                checked={service === item.value}
                onChange={handleServiceChange}
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="grid gap-2 font-medium">
          API key
          <Input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={handleKeyChange}
            placeholder={placeholder}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={busy || !apiKey.trim()}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            Save key
          </Button>

          {keyIsSaved && (
            <>
              <span className="text-sm">Saved key: {keyHint}</span>
              <Button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="rounded border px-4 py-2 disabled:opacity-50"
              >
                Remove key
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          The key is stored on the server and is never sent back to the browser
          in full.
        </p>
      </form>
    </fieldset>
  )
}

export default LumeanKeySection
