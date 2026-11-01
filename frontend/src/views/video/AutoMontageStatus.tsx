import { apiClient } from '@/api/apiClient'
import Button from '@/components/ui/Button'
import { useStockUploadStore } from '@/store/stockUpload.store'
import type { AutoMontage } from '@/types/video.types'
import { useState } from 'react'
import { toast } from 'sonner'
import { videoText } from './consts/video-text.const'

type AutoMontageStatusProps = {
  projectId: string
  autoMontage?: AutoMontage
  refresh: () => Promise<unknown>
}

const labels = {
  uploading: videoText.autoUploading,
  pending: videoText.autoPending,
  rendering: videoText.autoRendering,
  done: videoText.autoDone,
  failed: videoText.autoFailed,
} as const

const AutoMontageStatus = ({
  projectId,
  autoMontage,
  refresh,
}: AutoMontageStatusProps) => {
  const items = useStockUploadStore((state) => state.uploads[projectId])
  const [pending, setPending] = useState(false)

  if (!autoMontage) {
    return null
  }

  const total = items?.length ?? 0
  const finished =
    items?.filter((item) => item.status === 'done' || item.status === 'failed')
      .length ?? 0
  const failed = items?.filter((item) => item.status === 'failed').length ?? 0
  const uploading = autoMontage.status === 'uploading'
  // No live upload in this tab (page reloaded) or the upload ended without notifying the backend.
  const stuck = uploading && (total === 0 || finished === total)

  const resume = () => {
    setPending(true)
    apiClient.video
      .autoMontageUploaded(projectId, total - failed)
      .then(refresh)
      .catch(() => toast.error(videoText.error))
      .finally(() => setPending(false))
  }

  return (
    <section className="space-y-2 rounded-xl border p-4" aria-live="polite">
      <h3 className="font-semibold">{videoText.autoTitle}</h3>
      <p>{labels[autoMontage.status]}</p>
      {uploading && total > 0 && (
        <>
          <progress
            className="w-full"
            max={total}
            value={finished}
            aria-label={videoText.autoUploading}
          />
          <p className="text-sm">
            {finished} / {total}
            {failed > 0 && ` · ${failed} ${videoText.failed.toLowerCase()}`}
          </p>
        </>
      )}
      {stuck && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{videoText.autoStuck}</p>
          <Button disabled={pending} onClick={resume}>
            {videoText.autoContinue}
          </Button>
        </div>
      )}
      {autoMontage.error && (
        <p className="text-sm text-destructive">{autoMontage.error}</p>
      )}
    </section>
  )
}

export default AutoMontageStatus
