import { useState, type ChangeEvent, type SyntheticEvent } from 'react'
import usePolzaApiKey from '@/hooks/usePolzaApiKey.hook'

type PolzaKeySectionProps = {
  disabled: boolean
  keyIsSaved: boolean
  keyHint: string | null
  keyIsAvailable: boolean
}

const PolzaKeySection = ({
  disabled,
  keyIsSaved,
  keyHint,
  keyIsAvailable,
}: PolzaKeySectionProps) => {
  const [apiKey, setApiKey] = useState('')
  const keyActions = usePolzaApiKey()
  const busy = disabled || keyActions.isPending
  const placeholder = keyIsSaved
    ? 'Enter a new key to replace the saved one'
    : 'Paste your Polza.AI API key'
  const saveDisabled = busy || !apiKey.trim()
  const status = keyIsSaved
    ? `Settings key saved: ${keyHint}`
    : keyIsAvailable
      ? 'No Settings key saved. Using the server-configured environment key.'
      : 'No key is configured. Add a Settings key or configure POLZA_API_KEY on the server.'

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()

    const value = apiKey.trim()

    if (!value) {
      return
    }

    keyActions.saveKey(value).then((saved) => {
      if (saved) {
        setApiKey('')
      }
    })
  }

  const handleKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.currentTarget.value)
  }

  const handleRemove = () => {
    keyActions.removeKey()
  }

  return (
    <fieldset className="space-y-4 rounded-2xl border p-5" disabled={busy}>
      <legend className="px-2 text-lg font-semibold">Polza.AI</legend>

      <p className="text-sm text-muted-foreground">{status}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="grid gap-2 font-medium">
          API key
          <input
            type="password"
            autoComplete="new-password"
            value={apiKey}
            onChange={handleKeyChange}
            placeholder={placeholder}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saveDisabled}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            {keyIsSaved ? 'Replace key' : 'Save key'}
          </button>

          {keyIsSaved && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="rounded border px-4 py-2 disabled:opacity-50"
            >
              Remove Settings key
            </button>
          )}
        </div>
      </form>

      <p className="text-xs text-muted-foreground">
        This key is stored and used on the server. It is never sent back in
        full; only a masked hint is shown. It is not saved in browser storage.
      </p>
    </fieldset>
  )
}

export default PolzaKeySection
