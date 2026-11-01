import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { toast } from 'sonner'

type ReturnProps = {
  isPending: boolean
  saveKey: (value: string) => Promise<boolean>
  removeKey: () => Promise<boolean>
}

const usePolzaApiKey = (): ReturnProps => {
  const [isPending, setIsPending] = useState(false)
  const client = useQueryClient()

  const updateKey = async (value: string | null): Promise<boolean> => {
    setIsPending(true)

    try {
      await apiClient.appSettings.update({ polzaApiKey: value })
      toast.success('Settings saved')

      client
        .invalidateQueries({ queryKey: ['app-settings'] })
        .catch(() => undefined)

      return true
    } catch {
      toast.error('Could not save Polza.AI API key')

      return false
    } finally {
      setIsPending(false)
    }
  }

  const saveKey = (value: string) => updateKey(value)
  const removeKey = () => updateKey(null)

  return { isPending, saveKey, removeKey }
}

export default usePolzaApiKey
