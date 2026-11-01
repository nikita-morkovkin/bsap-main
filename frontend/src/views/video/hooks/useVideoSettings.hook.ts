import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import type { VideoStyleConfig } from '@/types/video.types'

type ReturnProps = {
  style?: VideoStyleConfig
  error?: string
}
type HookProps = { projectId: string }

export const useVideoSettings = ({ projectId }: HookProps): ReturnProps => {
  const query = useQuery({
    queryKey: ['video-settings', projectId],
    queryFn: () => apiClient.video.settings(projectId),
  })
  return {
    style: query.data,
    error: query.isError ? 'Could not load video settings.' : undefined,
  }
}
