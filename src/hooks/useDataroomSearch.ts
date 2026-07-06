import { useEffect, useState } from 'react'

import type { SearchResult } from '@/types'
import { itemService } from '@/services/itemService'

/**
 * Runs a name search across a whole dataroom whenever `query` (already debounced
 * by the caller) or `revision` changes. `revision` lets callers force a re-run
 * after mutations so results stay in sync with edits.
 *
 * Results are stored together with the query they belong to, so `ready` can be
 * derived synchronously: it's false while a new search is still resolving, which
 * lets the UI avoid a "no matches" flash without an effect-timing race. Stale
 * responses are dropped.
 */
export function useDataroomSearch(
  dataroomId: string,
  query: string,
  revision: number,
): { results: SearchResult[]; matchedQuery: string; ready: boolean } {
  const [state, setState] = useState<{ query: string; results: SearchResult[] }>({
    query: '',
    results: [],
  })

  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length === 0) {
      setState({ query: '', results: [] })
      return
    }

    let cancelled = false
    itemService.searchInDataroom(dataroomId, trimmed).then((results) => {
      if (!cancelled) setState({ query: trimmed, results })
    })
    return () => {
      cancelled = true
    }
    // revision forces a re-run after mutations even when the query is unchanged.
  }, [dataroomId, trimmed, revision])

  return {
    results: state.results,
    matchedQuery: state.query,
    // The current results correspond to the current query (search has settled).
    ready: state.query === trimmed,
  }
}
