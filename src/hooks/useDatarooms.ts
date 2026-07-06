import { useCallback, useEffect, useState } from 'react'

import type { Dataroom } from '@/types'
import { dataroomService } from '@/services/dataroomService'

interface UseDatarooms {
  datarooms: Dataroom[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/** Loads the list of datarooms and exposes a manual refresh after mutations. */
export function useDatarooms(): UseDatarooms {
  const [datarooms, setDatarooms] = useState<Dataroom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setDatarooms(await dataroomService.list())
    } catch (err) {
      console.error('Failed to load datarooms', err)
      setError('Could not load your datarooms.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { datarooms, loading, error, refresh }
}
