import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/apiClient';
import type { AppSettingsPatch } from '@/types/settings.types';

const key = ['app-settings'] as const;

export const useAppSettings = () =>
  useQuery({
    queryKey: key,
    queryFn: ({ signal }) => apiClient.appSettings.get(signal),
    staleTime: Infinity,
  });

export const useUpdateAppSettings = () => {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (patch: AppSettingsPatch) => apiClient.appSettings.update(patch),
    onSuccess: async (settings) => {
      client.setQueryData(key, settings);
      // The voice list belongs to the provider, so it must be reloaded after a switch.
      await client.invalidateQueries({ queryKey: ['settings', 'voices'] });
      toast.success('Settings saved');
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

      toast.error(message ?? 'Could not save settings');
    },
  });
};
