import { apiClient } from '@/api/apiClient'
import { queryKeys } from '@/consts/query.consts'
import { useStockUploadStore } from '@/store/stockUpload.store'
import { useUiStore } from '@/store/ui.store'
import type { CreateProjectPayload, ProjectState } from '@/types/project.types'
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query'
import { toast } from 'sonner'

export type CreateProjectVariables = Omit<
  CreateProjectPayload,
  'autoMontage'
> & {
  stockFiles?: File[]
}

type ReturnProps = UseMutationResult<
  ProjectState,
  Error,
  CreateProjectVariables
>

export const useCreateProjectMutation = (): ReturnProps => {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ stockFiles, ...payload }) =>
      apiClient.projects.createProject({
        ...payload,
        autoMontage: Boolean(stockFiles?.length),
      }),

    onSuccess: async (state, { stockFiles }) => {
      client.setQueryData(queryKeys.project(state.projectId), {
        state,
        outline: null,
      })

      if (stockFiles?.length) {
        useStockUploadStore.getState().start(state.projectId, stockFiles)
      }

      useUiStore.getState().selectProject(state.projectId)
      toast.success('Episode queued for production')
      await client.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}
