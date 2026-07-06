import { Download, Eye, Folder, FileText, MoreVertical, Pencil, Trash2 } from 'lucide-react'

import type { Item } from '@/types'
import { isFile } from '@/types'
import { formatBytes, formatDate, formatRelativeTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ItemCardProps {
  item: Item
  onOpen: (item: Item) => void
  onRename: (item: Item) => void
  onDelete: (item: Item) => void
  onDownload: (item: Item) => void
  /** When set (e.g. in search results), shown in place of the size/date meta. */
  location?: string
}

/**
 * A folder or file tile. Activating it opens the folder or the PDF viewer; the
 * ⋮ menu exposes rename/delete (and view/download for files).
 */
export function ItemCard({
  item,
  onOpen,
  onRename,
  onDelete,
  onDownload,
  location,
}: ItemCardProps) {
  const file = isFile(item)
  const meta =
    location ??
    (file
      ? `${formatBytes(item.size)} · ${formatRelativeTime(item.updatedAt)}`
      : `Updated ${formatRelativeTime(item.updatedAt)}`)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        // Only handle keys aimed at the card itself; ignore Enter/Space that
        // bubble up from the actions menu (Radix handles those on its own).
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(item)
        }
      }}
      className="group relative flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={
          file
            ? 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600'
            : 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'
        }
      >
        {file ? <FileText className="size-5" /> : <Folder className="size-5" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={item.name}>
          {item.name}
        </p>
        <p
          className="truncate text-xs text-muted-foreground"
          title={location ? undefined : formatDate(item.updatedAt)}
        >
          {meta}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            aria-label={`Actions for ${item.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {file ? (
            <>
              <DropdownMenuItem onSelect={() => onOpen(item)}>
                <Eye />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDownload(item)}>
                <Download />
                Download
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onSelect={() => onOpen(item)}>
              <Folder />
              Open
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onRename(item)}>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
