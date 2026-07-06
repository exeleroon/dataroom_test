import { useMemo, useState } from 'react'
import { FolderPlus, Plus, SearchX } from 'lucide-react'
import { toast } from 'sonner'

import type { Dataroom } from '@/types'
import { dataroomService } from '@/services/dataroomService'
import { useDatarooms } from '@/hooks/useDatarooms'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { NameDialog } from '@/components/NameDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SearchInput } from '@/components/SearchInput'
import { DataroomCard } from '@/pages/dataRoom/DataroomCard'

export function DataroomsPage() {
  const { datarooms, loading, error, refresh } = useDatarooms()

  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Dataroom | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Dataroom | null>(null)

  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return datarooms
    return datarooms.filter((room) => room.name.toLowerCase().includes(q))
  }, [datarooms, query])

  const handleCreate = async (name: string) => {
    const room = await dataroomService.create(name)
    await refresh()
    toast.success(`Dataroom “${room.name}” created`)
  }

  const handleRename = async (name: string) => {
    if (!renameTarget) return
    await dataroomService.rename(renameTarget.id, name)
    await refresh()
    toast.success('Dataroom renamed')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await dataroomService.delete(deleteTarget.id)
    await refresh()
    toast.success(`Dataroom “${deleteTarget.name}” deleted`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Datarooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Secure, organized repositories for your due-diligence documents.
          </p>
        </div>
        {datarooms.length > 0 && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New dataroom
          </Button>
        )}
      </div>

      {!loading && !error && datarooms.length > 0 && (
        <div className="mb-6">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search datarooms…"
            ariaLabel="Search datarooms"
            className="sm:max-w-xs"
          />
        </div>
      )}

      {loading ? (
        <DataroomGridSkeleton />
      ) : error ? (
        <EmptyState
          icon={FolderPlus}
          title="Couldn't load datarooms"
          description={error}
          action={
            <Button variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          }
        />
      ) : datarooms.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No datarooms yet"
          description="Create your first dataroom to start organizing and uploading documents."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              New dataroom
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No datarooms match"
          description={`No datarooms match “${query.trim()}”.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((room) => (
            <DataroomCard
              key={room.id}
              dataroom={room}
              onRename={setRenameTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <NameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New dataroom"
        label="Dataroom name"
        placeholder="e.g. Project Titan — Due Diligence"
        submitLabel="Create"
        onSubmit={handleCreate}
      />

      <NameDialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title="Rename dataroom"
        label="Dataroom name"
        initialValue={renameTarget?.name ?? ''}
        submitLabel="Rename"
        onSubmit={handleRename}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete “${deleteTarget?.name}”?`}
        description="This permanently removes the dataroom and every folder and file inside it. This action cannot be undone."
        confirmLabel="Delete dataroom"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}

function DataroomGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="size-11 rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}
