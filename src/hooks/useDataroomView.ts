import { useCallback, useEffect, useRef, useState } from 'react'

import type { Crumb, Dataroom, Item } from '@/types'
import { isFolder } from '@/types'
import { dataroomService } from '@/services/dataroomService'
import { itemService } from '@/services/itemService'

type Status = 'loading' | 'ready' | 'not-found' | 'error'

interface UseDataroomView {
  dataroom: Dataroom | null
  items: Item[]
  breadcrumbs: Crumb[]
  status: Status
  /** Current folder id (null at the dataroom root). */
  folderId: string | null
  refresh: () => Promise<void>
}

/**
 * Loads everything needed to render one folder view: the dataroom, the current
 * folder's direct children, and the breadcrumb trail. A single hook keeps the
 * three reads consistent and gives components one `refresh` to call after edits.
 */
export function useDataroomView(
  dataroomId: string,
  folderId: string | null,
): UseDataroomView {
  const [dataroom, setDataroom] = useState<Dataroom | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([])
  const [status, setStatus] = useState<Status>('loading')

  // Monotonic request id: only the most recent refresh may write to state, so a
  // slow earlier load can never overwrite a newer folder's data (or a mutation refresh).
  const requestRef = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current
    const isStale = () => requestId !== requestRef.current

    try {
      const room = await dataroomService.get(dataroomId)
      if (isStale()) return
      if (!room) {
        setStatus('not-found')
        return
      }

      // On the folder route, the id must resolve to a real folder — reject file
      // ids and deleted/invalid ids instead of rendering them as an empty folder.
      if (folderId !== null) {
        const target = await itemService.getItem(folderId)
        if (isStale()) return
        if (!target || !isFolder(target)) {
          setStatus('not-found')
          return
        }
      }

      const [children, trail] = await Promise.all([
        itemService.listChildren(dataroomId, folderId),
        itemService.getBreadcrumbs(dataroomId, folderId),
      ])
      if (isStale()) return

      setDataroom(room)
      setItems(children)
      setBreadcrumbs(trail)
      setStatus('ready')
    } catch (err) {
      if (isStale()) return
      console.error('Failed to load dataroom view', err)
      setStatus('error')
    }
  }, [dataroomId, folderId])

  useEffect(() => {
    // Show the full-page skeleton only on the first load. On later navigations
    // keep the current folder's view on screen (stale-while-revalidate) until the
    // next folder's data arrives, so clicking into a folder doesn't flash a
    // skeleton on every click. IndexedDB reads are near-instant, so the swap is
    // imperceptible; a subsequent not-found/error still takes over once refresh
    // resolves. requestRef is 0 only before the very first refresh() runs.
    if (requestRef.current === 0) setStatus('loading')
    void refresh()
  }, [refresh])

  return { dataroom, items, breadcrumbs, status, folderId, refresh }
}
