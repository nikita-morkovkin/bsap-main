import Button from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import type { VideoStyleConfig } from '@/types/video.types'
import { useState } from 'react'
import { videoControls } from './consts/video-controls.const'
import { videoText } from './consts/video-text.const'
import StyleNumber from './StyleNumber'

type StyleSettingsPanelProps = {
  style: VideoStyleConfig
  onChange: (style: VideoStyleConfig) => void
}

const StyleSettingsPanel = ({ style, onChange }: StyleSettingsPanelProps) => {
  const [selectedPreset, setSelectedPreset] = useState('dark')

  const preset = (value: string | null) => {
    if (value === null) return

    setSelectedPreset(value)
    const values =
      value === 'natural'
        ? [0, 1, 1, 1]
        : value === 'soft'
          ? [-0.12, 0.95, 0.85, 0.95]
          : [-0.05, 0.88, 0.75, 0.85]
    const [brightness, contrast, saturation, gamma] = values

    onChange({
      ...style,
      brightness,
      contrast,
      saturation,
      gamma,
      vignetteEnabled: true,
    })
  }

  const reset = () => {
    setSelectedPreset('dark')
    onChange({
      ...style,
      brightness: -0.05,
      contrast: 0.88,
      saturation: 0.75,
      gamma: 0.85,
      vignetteEnabled: true,
      crossfadeSec: 3,
      slowMoDefault: 1.25,
      slowMoMax: 2,
    })
  }

  const vignette = (checked: boolean) => {
    onChange({ ...style, vignetteEnabled: checked })
  }

  const mirror = (checked: boolean) => {
    onChange({ ...style, mirrorOnRepeat: checked })
  }

  const antiBanding = (checked: boolean) => {
    onChange({ ...style, antiBanding: checked })
  }

  const transition = (value: string | null) => {
    if (value === 'fade' || value === 'smoothleft' || value === 'dissolve') {
      onChange({ ...style, transition: value })
    }
  }

  const angle = (value: string | null) => {
    if (
      value === 'PI/3' ||
      value === 'PI/4' ||
      value === 'PI/5' ||
      value === 'PI/6'
    ) {
      onChange({ ...style, vignetteAngle: value })
    }
  }
  const reshuffle = () => {
    onChange({ ...style, seed: crypto.getRandomValues(new Uint32Array(1))[0] })
  }

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">{videoText.style}</h3>
      <Select value={selectedPreset} onValueChange={preset}>
        <SelectTrigger aria-label={videoText.style} className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dark">{videoText.dark}</SelectItem>
          <SelectItem value="soft">{videoText.soft}</SelectItem>
          <SelectItem value="natural">{videoText.natural}</SelectItem>
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {videoControls.map((control) => (
          <StyleNumber
            key={control.key}
            control={control}
            style={style}
            onChange={onChange}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={style.antiBanding}
            onCheckedChange={antiBanding}
          />{' '}
          Anti-banding
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={style.vignetteEnabled}
            onCheckedChange={vignette}
          />{' '}
          {videoText.vignette}
        </label>
        <label className="flex items-center gap-2">
          {videoText.angle}
          <Select value={style.vignetteAngle} onValueChange={angle}>
            <SelectTrigger aria-label={videoText.angle} className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PI/3">PI/3</SelectItem>
              <SelectItem value="PI/4">PI/4</SelectItem>
              <SelectItem value="PI/5">PI/5</SelectItem>
              <SelectItem value="PI/6">PI/6</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={style.mirrorOnRepeat}
            onCheckedChange={mirror}
          />{' '}
          {videoText.mirror}
        </label>
        <label className="flex items-center gap-2">
          {videoText.transition}
          <Select value={style.transition} onValueChange={transition}>
            <SelectTrigger aria-label={videoText.transition} className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fade">fade</SelectItem>
              <SelectItem value="smoothleft">smoothleft</SelectItem>
              <SelectItem value="dissolve">dissolve</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      <Button type="button" variant="outline" onClick={reshuffle}>
        {videoText.reshuffle}
      </Button>
      <Button type="button" variant="outline" onClick={reset}>
        {videoText.reset}
      </Button>
    </section>
  )
}

export default StyleSettingsPanel
