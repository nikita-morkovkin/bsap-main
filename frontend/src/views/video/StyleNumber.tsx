import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Slider } from '@/components/ui/Slider'
import type { VideoStyleConfig } from '@/types/video.types'
import { videoText } from './consts/video-text.const'
import { videoControls } from './consts/video-controls.const'

type StyleNumberProps = {
  control: (typeof videoControls)[number]
  style: VideoStyleConfig
  onChange: (style: VideoStyleConfig) => void
}

const StyleNumber = ({ control, style, onChange }: StyleNumberProps) => {
  const value = style[control.key]
  const label = videoText[control.key]
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value)

    if (Number.isFinite(next)) {
      onChange({ ...style, [control.key]: next })
    }
  }

  return (
    <label className="space-y-1 text-sm">
      <span className="block">{label}</span>
      <Slider
        aria-label={label}
        value={[value]}
        min={control.min}
        max={control.max}
        step={control.step}
        onValueChange={(values) => {
          const next = Array.isArray(values) ? values[0] : values

          if (next !== undefined) {
            onChange({ ...style, [control.key]: next })
          }
        }}
      />
      <Input
        type="number"
        aria-label={label}
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onChange={handleChange}
        className="h-8 rounded-md px-2 py-1"
      />
    </label>
  )
}

export default StyleNumber
