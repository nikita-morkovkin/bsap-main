import { appSettingsApi } from './app-settings.api'
import { effectsApi } from './effects.api'
import { exportsApi } from './exports.api'
import { mediaApi } from './media.api'
import { musicApi } from './music.api'
import { projectsApi } from './projects.api'
import { videoApi } from './video.api'

export const apiClient = {
  projects: projectsApi,
  media: mediaApi,
  music: musicApi,
  video: videoApi,
  exports: exportsApi,
  effects: effectsApi,
  appSettings: appSettingsApi,
}
