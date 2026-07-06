import { SearchX } from 'lucide-react'

import type { Item, SearchResult } from '@/types'
import { EmptyState } from '@/components/EmptyState'
import { ItemCard } from '@/pages/dataRoom/ItemCard'

interface SearchResultsProps {
  results: SearchResult[]
  query: string
  /** Whether the results correspond to the current query yet. */
  ready: boolean
  dataroomName: string
  onOpen: (item: Item) => void
  onRename: (item: Item) => void
  onDelete: (item: Item) => void
  onDownload: (item: Item) => void
}

/**
 * Dataroom-wide search results grid. Each card shows where the match lives so
 * users can tell apart identically named items in different folders.
 */
export function SearchResults({
  results,
  query,
  ready,
  dataroomName,
  onOpen,
  onRename,
  onDelete,
  onDownload,
}: SearchResultsProps) {
  if (results.length === 0) {
    // Only claim "no matches" once results actually correspond to the query;
    // while a search is still resolving, render nothing (avoids a flash).
    if (!ready) return null
    return (
      <EmptyState
        icon={SearchX}
        title="No matches"
        description={`Nothing in this dataroom matches “${query}”.`}
      />
    )
  }

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">
        {results.length} result{results.length === 1 ? '' : 's'} for “{query}”
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map(({ item, path }) => (
          <ItemCard
            key={item.id}
            item={item}
            location={
              path.length > 0 ? `in ${path.map((c) => c.name).join(' / ')}` : `in ${dataroomName}`
            }
            onOpen={onOpen}
            onRename={onRename}
            onDelete={onDelete}
            onDownload={onDownload}
          />
        ))}
      </div>
    </>
  )
}