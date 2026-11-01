import type { AppSettings, AppSettingsPatch } from '@/types/settings.types';
import { axiosInstance } from './axiosInstance';

export const appSettingsApi = {
  get: async (signal?: AbortSignal): Promise<AppSettings> => {
    const { data } = await axiosInstance.get<AppSettings>('/app-settings', { signal });

    return data;
  },
  update: async (patch: AppSettingsPatch): Promise<AppSettings> => {
    const { data } = await axiosInstance.put<AppSettings>('/app-settings', patch);

    return data;
  },
};
