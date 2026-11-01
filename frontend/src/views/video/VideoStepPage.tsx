import AutoMontageStatus from './AutoMontageStatus'
import BuildPanel from './BuildPanel'
import { videoText } from './consts/video-text.const'
import EffectsPanel from './EffectsPanel'
import FramePreview from './FramePreview'
import { useVideoJob } from './hooks/useVideoJob.hook'
import { useVideoSettings } from './hooks/useVideoSettings.hook'
import StockLibrary from './StockLibrary'

type VideoStepPageProps = { projectId: string }

const VideoStepPage = ({ projectId }: VideoStepPageProps) => {
  const settings = useVideoSettings({ projectId })
  const { status, refresh } = useVideoJob({ projectId })
  const style = status?.style ?? settings.style

  const busy = Boolean(
    status?.job && !['done', 'failed', 'cancelled'].includes(status.job.stage),
  )

  return (
    <details className="space-y-6 rounded-2xl border p-5">
      <summary className="cursor-pointer text-xl font-semibold">
        {videoText.title}
      </summary>
      <AutoMontageStatus
        projectId={projectId}
        autoMontage={status?.autoMontage}
        refresh={refresh}
      />
      <StockLibrary projectId={projectId} busy={busy} />
      <EffectsPanel projectId={projectId} busy={busy} />
      {settings.error && (
        <p role="alert" className="text-destructive">
          {settings.error}
        </p>
      )}
      {style ? (
        <>
          <FramePreview projectId={projectId} style={style} />
          <BuildPanel
            projectId={projectId}
            style={style}
            status={status}
            refresh={refresh}
            busy={busy}
          />
        </>
      ) : (
        <p>{videoText.loading}</p>
      )}
    </details>
  )
}

export default VideoStepPage
