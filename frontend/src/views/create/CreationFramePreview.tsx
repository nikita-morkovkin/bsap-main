import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { apiClient } from '@/api/apiClient'
import Button from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import type { VideoStyleConfig } from '@/types/video.types'
import { videoText } from '@/views/video/consts/video-text.const'

type CreationFramePreviewProps = {
  files: File[]
  style: VideoStyleConfig
  valid: boolean
}

const CreationFramePreview = ({
  files,
  style,
  valid,
}: CreationFramePreviewProps) => {
  const fileInput = useRef<HTMLInputElement>(null)
  const [sample, setSample] = useState('0')
  const [previewFile, setPreviewFile] = useState<File>()
  const [frame, setFrame] = useState<{ file: File; blob: Blob; url: string }>()
  const [graded, setGraded] = useState<{
    file: File
    style: VideoStyleConfig
    url: string
  }>()
  const [error, setError] = useState<string>()
  const selectedFile =
    sample === 'preview' ? previewFile : (files[Number(sample)] ?? files[0])

  useEffect(() => {
    if (!selectedFile) return
    const abort = new AbortController()
    let url: string | undefined
    apiClient.video
      .sourceFrame(selectedFile, abort.signal)
      .then((blob) => {
        if (!abort.signal.aborted) {
          url = URL.createObjectURL(blob)
          setFrame({ file: selectedFile, blob, url })
          setError(undefined)
        }
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setError(
            'Could not extract a preview frame. Check the video or try another clip.',
          )
      })
    return () => {
      abort.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [selectedFile])

  useEffect(() => {
    if (!frame || frame.file !== selectedFile || !valid) return
    const abort = new AbortController()
    let url: string | undefined
    const timer = setTimeout(() => {
      apiClient.video
        .stylePreview(frame.blob, style, abort.signal)
        .then((blob) => {
          if (!abort.signal.aborted) {
            url = URL.createObjectURL(blob)
            setGraded({ file: frame.file, style, url })
            setError(undefined)
          }
        })
        .catch(() => {
          if (!abort.signal.aborted)
            setError('Could not generate the graded preview.')
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      abort.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [frame, selectedFile, style, valid])

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFrame(undefined)
      setGraded(undefined)
      setPreviewFile(file)
      setSample('preview')
    }
    event.target.value = ''
  }
  const chooseSample = (value: string | null) => {
    if (value === null) return

    setFrame(undefined)
    setGraded(undefined)
    setSample(value)
  }

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">{videoText.sample}</h3>
      <div className="space-y-2 text-sm">
        <p>Choose a preview-only clip</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            hidden
            accept="video/*,.mkv,.mov,.m4v"
            onChange={chooseFile}
            aria-label="Choose a preview-only clip"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInput.current?.click()}
          >
            Browse…
          </Button>
          <span className="text-muted-foreground">
            {previewFile?.name ?? 'No file selected'}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        The selected clip is temporarily uploaded to extract a frame.
        Preview-only clips are not added to automatic montage.
      </p>
      {(files.length > 0 || previewFile) && (
        <div className="grid max-w-sm gap-2 text-sm font-medium">
          <span>{videoText.sample}</span>
          <Select
            value={
              selectedFile === previewFile && previewFile
                ? 'preview'
                : String(Math.max(0, files.indexOf(selectedFile as File)))
            }
            onValueChange={chooseSample}
          >
            <SelectTrigger aria-label={videoText.sample} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {files.map((file, index) => (
                <SelectItem key={index} value={String(index)}>
                  {file.name}
                </SelectItem>
              ))}
              {previewFile && (
                <SelectItem value="preview">
                  {previewFile.name} (preview only)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      {!selectedFile && (
        <p className="text-sm text-muted-foreground">
          Choose a clip here or add clips to Automatic montage to preview your
          style.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {selectedFile && frame?.file === selectedFile && (
          <figure>
            <img
              src={frame.url}
              alt={videoText.original}
              className="w-full rounded"
            />
            <figcaption>{videoText.original}</figcaption>
          </figure>
        )}
        {selectedFile &&
          graded?.file === selectedFile &&
          graded.style === style &&
          valid && (
            <figure>
              <img
                src={graded.url}
                alt={videoText.graded}
                className="w-full rounded"
              />
              <figcaption>{videoText.graded}</figcaption>
            </figure>
          )}
      </div>
      {selectedFile && frame?.file !== selectedFile && !error && (
        <p role="status">Uploading clip and extracting preview frame…</p>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}

export default CreationFramePreview
