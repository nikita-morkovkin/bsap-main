import { useAppSettings, useUpdateAppSettings } from "@/hooks/queries/useAppSettings.hook";
import type { AppSettings, KokoroDevice, LumeanService, TtsProvider } from "@/types/settings.types";
import { useState, type FormEvent } from "react";

const providers: { value: TtsProvider; label: string; help: string }[] = [
  { value: "kokoro", label: "Kokoro (local)", help: "Runs on your server. Free, no key needed." },
  {
    value: "lumean",
    label: "Lumean",
    help: "Cloud voices through the Lumean API. Each chunk is a separate order, so narration is slower. Needs an API key.",
  },
];

const devices: { value: KokoroDevice; label: string; help: string }[] = [
  { value: "cpu", label: "CPU", help: "Default. Works on any machine, slower synthesis." },
  {
    value: "gpu",
    label: "GPU (NVIDIA)",
    help: "Faster. Needs an NVIDIA GPU and: docker compose --profile gpu up -d kokoro-tts-gpu",
  },
];

const lumeanServices: { value: LumeanService; label: string }[] = [
  { value: "elevenlabs", label: "ElevenLabs" },
  { value: "cartesia", label: "Cartesia" },
];

const radioClass = "flex items-start gap-3 rounded-xl border p-4";

const SettingsView = () => {
  const query = useAppSettings();
  const mutation = useUpdateAppSettings();
  const [apiKey, setApiKey] = useState("");
  const settings: AppSettings | undefined = query.data;
  const busy = query.isPending || mutation.isPending;

  const saveKey = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = apiKey.trim();

    if (!value) {
      return;
    }

    mutation.mutate({ lumeanApiKey: value }, { onSuccess: () => setApiKey("") });
  };

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <fieldset className="space-y-4 rounded-2xl border p-5" disabled={busy}>
        <legend className="px-2 text-lg font-semibold">Narration provider</legend>
        {providers.map((provider) => (
          <label key={provider.value} className={radioClass}>
            <input
              type="radio"
              name="tts-provider"
              value={provider.value}
              checked={settings?.ttsProvider === provider.value}
              onChange={() => mutation.mutate({ ttsProvider: provider.value })}
              className="mt-1 size-4"
            />
            <span>
              <span className="block font-medium">{provider.label}</span>
              <span className="block text-sm text-muted-foreground">{provider.help}</span>
            </span>
          </label>
        ))}
        <p className="text-sm text-muted-foreground">
          Changing the provider changes the voice list. A project keeps its saved voice, so pick a voice from the new list
          before creating an episode.
        </p>
      </fieldset>

      {settings?.ttsProvider === "kokoro" && (
        <fieldset className="space-y-4 rounded-2xl border p-5" disabled={busy}>
          <legend className="px-2 text-lg font-semibold">Kokoro device</legend>
          {devices.map((device) => (
            <label key={device.value} className={radioClass}>
              <input
                type="radio"
                name="kokoro-device"
                value={device.value}
                checked={settings.kokoroDevice === device.value}
                onChange={() => mutation.mutate({ kokoroDevice: device.value })}
                className="mt-1 size-4"
              />
              <span>
                <span className="block font-medium">{device.label}</span>
                <span className="block text-sm text-muted-foreground">{device.help}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {settings?.ttsProvider === "lumean" && (
        <fieldset className="space-y-4 rounded-2xl border p-5" disabled={busy}>
          <legend className="px-2 text-lg font-semibold">Lumean</legend>

          <div className="space-y-2">
            <p className="font-medium">Voice service</p>
            <div className="flex gap-4">
              {lumeanServices.map((service) => (
                <label key={service.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="lumean-service"
                    value={service.value}
                    checked={settings.lumeanService === service.value}
                    onChange={() => mutation.mutate({ lumeanService: service.value })}
                  />
                  {service.label}
                </label>
              ))}
            </div>
          </div>

          <form onSubmit={saveKey} className="space-y-2">
            <label className="grid gap-2 font-medium">
              API key
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={settings.lumeanApiKeySet ? "Enter a new key to replace the saved one" : "Paste your Lumean API key"}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={busy || !apiKey.trim()}
                className="rounded border px-4 py-2 disabled:opacity-50"
              >
                Save key
              </button>
              {settings.lumeanApiKeySet && (
                <>
                  <span className="text-sm">Saved key: {settings.lumeanApiKeyHint}</span>
                  <button
                    type="button"
                    onClick={() => mutation.mutate({ lumeanApiKey: null })}
                    className="rounded border px-4 py-2"
                  >
                    Remove key
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              The key is stored on the server in plain text and is never sent back to the browser in full.
            </p>
          </form>
        </fieldset>
      )}

      {query.isError && (
        <p role="alert" className="text-destructive">
          Could not load settings.{" "}
          <button type="button" className="underline" onClick={() => query.refetch()}>
            Retry
          </button>
        </p>
      )}
    </section>
  );
};

export default SettingsView;
