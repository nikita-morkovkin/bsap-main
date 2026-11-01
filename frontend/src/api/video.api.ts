import type {
  StockClip,
  VideoJob,
  VideoStatus,
  VideoStyleConfig,
} from '@/types/video.types'
import { axiosInstance } from './axiosInstance'

export const videoApi = {
  sourceFrame: async (file: File, signal: AbortSignal): Promise<Blob> => {
    const body = new FormData()
    body.append('file', file)
    const { data } = await axiosInstance.post<Blob>(
      '/video-style-preview/frame',
      body,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
        signal,
      },
    )
    return data
  },
  stylePreview: async (
    frame: Blob,
    style: VideoStyleConfig,
    signal: AbortSignal,
  ): Promise<Blob> => {
    const body = new FormData()
    body.append('frame', frame, 'frame.jpg')
    body.append('style', JSON.stringify(style))
    const { data } = await axiosInstance.post<Blob>(
      '/video-style-preview',
      body,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
        signal,
      },
    )
    return data
  },
  root: (id: string) => `/projects/${encodeURIComponent(id)}/video`,
  url: (id: string, suffix: string) =>
    `${axiosInstance.defaults.baseURL}${videoApi.root(id)}/${suffix}`,
  clips: async (id: string): Promise<StockClip[]> =>
    (await axiosInstance.get(`${videoApi.root(id)}/clips`)).data,
  status: async (id: string): Promise<VideoStatus> =>
    (await axiosInstance.get(`${videoApi.root(id)}/status`)).data,
  settings: async (id: string): Promise<VideoStyleConfig> =>
    (await axiosInstance.get(`${videoApi.root(id)}/settings`)).data,
  save: async (
    id: string,
    style: VideoStyleConfig,
    signal?: AbortSignal,
  ): Promise<void> => {
    await axiosInstance.put(`${videoApi.root(id)}/settings`, style, { signal })
  },
  toggle: async (
    id: string,
    clipId: string,
    enabled: boolean,
  ): Promise<void> => {
    await axiosInstance.patch(`${videoApi.root(id)}/clips/${clipId}`, {
      enabled,
    })
  },
  delete: async (id: string, clipId: string): Promise<void> => {
    await axiosInstance.delete(`${videoApi.root(id)}/clips/${clipId}`)
  },
  clear: async (id: string): Promise<void> => {
    await axiosInstance.delete(`${videoApi.root(id)}/cache`)
  },
  upload: async (
    id: string,
    file: File,
    progress: (value: number) => void,
  ): Promise<void> => {
    const body = new FormData()

    body.append('files', file)

    const { data } = await axiosInstance.post<{ error?: string }[]>(
      `${videoApi.root(id)}/clips`,
      body,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) =>
          progress(event.total ? event.loaded / event.total : 0),
      },
    )

    if (data[0]?.error) {
      throw new Error(data[0].error)
    }
  },
  autoMontageUploaded: async (id: string, uploaded: number): Promise<void> => {
    await axiosInstance.post(`${videoApi.root(id)}/auto-montage/uploaded`, {
      uploaded,
    })
  },
  frame: async (
    id: string,
    style: VideoStyleConfig,
    clipId: string,
    signal: AbortSignal,
  ): Promise<Blob> =>
    (
      await axiosInstance.post(
        `${videoApi.root(id)}/preview/frame`,
        { style, clipId },
        { signal, responseType: 'blob' },
      )
    ).data,
  start: async (
    id: string,
    kind: VideoJob['kind'],
    style: VideoStyleConfig,
  ): Promise<VideoJob> => {
    const route = kind === 'preview' ? 'preview/clip' : kind

    return (
      await axiosInstance.post(`${videoApi.root(id)}/${route}`, { style })
    ).data
  },
  job: async (id: string, jobId: string): Promise<VideoJob> =>
    (await axiosInstance.get(`${videoApi.root(id)}/jobs/${jobId}`)).data,
  cancel: async (id: string, jobId: string): Promise<void> => {
    await axiosInstance.post(`${videoApi.root(id)}/jobs/${jobId}/cancel`)
  },
}
