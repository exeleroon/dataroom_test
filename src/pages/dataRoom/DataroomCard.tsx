import { Link } from 'react-router-dom'
import { FolderLock, MoreVertical, Pencil, Trash2 } from 'lucide-react'

import type { Dataroom } from '@/types'
import { formatDate, formatRelativeTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DataroomCardProps {
  dataroom: Dataroom
  onRename: (dataroom: Dataroom) => void
  onDelete: (dataroom: Dataroom) => void
}

/**
 * Grid tile for a single dataroom. Uses the "stretched link" pattern: a full-tile
 * <Link> overlay handles navigation, while the actions menu button sits above it
 * (z-10) as a valid, separate control — avoiding an interactive button nested in
 * an <a> (invalid HTML / broken a11y).
 */
export function DataroomCard({ dataroom, onRename, onDelete }: DataroomCardProps) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring">
      <Link
        to={`/d/${dataroom.id}`}
        aria-label={`Open ${dataroom.name}`}
        title={dataroom.name}
        className="absolute inset-0 rounded-xl focus-visible:outline-none"
      />

      <div className="flex items-start justify-between">
        <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderLock className="size-5" />
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative z-10 size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Actions for ${dataroom.name}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onRename(dataroom)}>
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(dataroom)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-w-0">
        <h3 className="truncate font-medium">{dataroom.name}</h3>
        <p
          className="mt-0.5 text-xs text-muted-foreground"
          title={formatDate(dataroom.updatedAt)}
        >
          Updated {formatRelativeTime(dataroom.updatedAt)}
        </p>
      </div>
    </div>
  )
}
