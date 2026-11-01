import { apiClient } from '@/api/apiClient'
import type { VideoUploadItem } from '@/types/video.types'
import { create } from 'zustand'

type StockUploadState = {
  /** Upload items per project; lives outside React so it survives leaving the Create page. */
  uploads: Record<string, VideoUploadItem[]>
  start: (projectId: string, files: File[]) => void
}

const VIDEO_FILE = /\.(mp4|mov|mkv|webm|m4v)$/i
const CONCURRENCY = 3

export const useStockUploadStore = create<StockUploadState>((set, get) => {
  const patch = (
    projectId: string,
    id: string,
    changes: Partial<VideoUploadItem>,
  ) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [projectId]: (state.uploads[projectId] ?? []).map((item) =>
          item.id === id ? { ...item, ...changes } : item,
        ),
      },
    }))

  const run = async (projectId: string, items: VideoUploadItem[]) => {
    const queue = items.filter((item) => item.status === 'queued')

    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { id, file } = next

        patch(projectId, id, { status: 'uploading' })

        try {
          await apiClient.video.upload(projectId, file, (progress) =>
            patch(projectId, id, { progress }),
          )
          patch(projectId, id, { status: 'done', progress: 1 })
        } catch (error) {
          patch(projectId, id, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Upload failed',
          })
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker))

    const done = (get().uploads[projectId] ?? []).filter(
      (item) => item.status === 'done',
    ).length

    // Tells the backend the clips are in; it then starts the build as soon as the audio is mastered.
    await apiClient.video
      .autoMontageUploaded(projectId, done)
      .catch(() => undefined)
  }

  return {
    uploads: {},
    start: (projectId, files) => {
      const items: VideoUploadItem[] = files.map((file) => {
        const accepted = VIDEO_FILE.test(file.name)

        return {
          id: crypto.randomUUID(),
          file,
          progress: 0,
          status: accepted ? 'queued' : 'failed',
          error: accepted ? undefined : 'Unsupported file extension',
        }
      })

      set((state) => ({ uploads: { ...state.uploads, [projectId]: items } }))
      void run(projectId, items)
    },
  }
})
