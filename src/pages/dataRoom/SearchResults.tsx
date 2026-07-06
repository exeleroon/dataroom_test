import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'

import type { Crumb, Item, SearchResult } from '@/types'
import { EmptyState } from '@/components/EmptyState'
import { ItemCard } from '@/pages/dataRoom/ItemCard'

interface SearchResultsProps {
  results: SearchResult[]
  query: string
  /** Whether the results correspond to the current query yet. */
  ready: boolean
  dataroomId: string
  dataroomName: string
  onOpen: (item: Item) => void
  onRename: (item: Item) => void
  onDelete: (item: Item) => void
  onDownload: (item: Item) => void
}

/** Route to a folder crumb; a null id is the dataroom root. */
function folderPath(dataroomId: string, crumbId: string | null): string {
  return crumbId ? `/d/${dataroomId}/f/${crumbId}` : `/d/${dataroomId}`
}

/**
 * URL-style breadcrumb of the folders leading to a search hit. The path starts
 * at the dataroom (where search begins), and every hop is a link. Following the
 * last hop — the item's own folder — carries a `highlight` param so the folder
 * view can flag the item once we land there.
 */
function ResultLocation({
  dataroomId,
  dataroomName,
  path,
  itemId,
}: {
  dataroomId: string
  dataroomName: string
  path: Crumb[]
  itemId: string
}) {
  // Prepend the dataroom root so the path always shows its starting point.
  const crumbs: Crumb[] = [{ id: null, name: dataroomName }, ...path]

  return (
    <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
      <span className="shrink-0 text-muted-foreground">in</span>
      {crumbs.map((crumb, index) => {
        const isParent = index === crumbs.length - 1
        const to = isParent
          ? `${folderPath(dataroomId, crumb.id)}?highlight=${itemId}`
          : folderPath(dataroomId, crumb.id)
        return (
          <Fragment key={crumb.id ?? 'root'}>
            {index > 0 && <span className="shrink-0 text-muted-foreground/50">/</span>}
            <Link
              to={to}
              // Don't let the crumb click also open the card (file viewer).
              onClick={(e) => e.stopPropagation()}
              className="max-w-[12rem] truncate rounded font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={crumb.name}
            >
              {crumb.name}
            </Link>
          </Fragment>
        )
      })}
    </span>
  )
}

/**
 * Dataroom-wide search results grid. Each card shows where the match lives so
 * users can tell apart identically named items in different folders.
 */
export function SearchResults({
  results,
  query,
  ready,
  dataroomId,
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
              <ResultLocation
                dataroomId={dataroomId}
                dataroomName={dataroomName}
                path={path}
                itemId={item.id}
              />
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