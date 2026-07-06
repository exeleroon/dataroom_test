import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FolderPlus, Inbox, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'

import type { FileItem, Item } from '@/types'
import { isFile, isFolder } from '@/types'
import { itemService } from '@/services/itemService'
import { dataroomService } from '@/services/dataroomService'
import { useDataroomView } from '@/hooks/useDataroomView'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDataroomSearch } from '@/hooks/useDataroomSearch'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { NameDialog } from '@/components/NameDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SearchInput } from '@/components/SearchInput'
import { DataroomBreadcrumbs } from '@/pages/dataRoom/DataroomBreadcrumbs'
import { UploadButton } from '@/pages/dataRoom/UploadButton'
import { ItemCard } from '@/pages/dataRoom/ItemCard'
import { PdfViewerDialog } from '@/pages/dataRoom/PdfViewerDialog'
import { SearchResults } from '@/pages/dataRoom/SearchResults'
import { DataroomPageSkeleton } from '@/pages/dataRoom/DataroomPageSkeleton'
import { CenteredMessage } from '@/pages/dataRoom/CenteredMessage'

export function DataroomPage() {
  const { dataroomId = '', folderId } = useParams()
  const navigate = useNavigate()
  const currentFolderId = folderId ?? null

  const { dataroom, items, breadcrumbs, status, refresh } = useDataroomView(
    dataroomId,
    currentFolderId,
  )

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 500)
  // Enter "search mode" only once the debounced query settles, so the folder view
  // isn't torn down on every keystroke while the user is still typing. Clearing the
  // box (query empty) leaves search immediately.
  const isSearching = query.trim().length > 0 && debouncedQuery.trim().length > 0
  // Bump after every mutation so an active search re-runs and stays in sync.
  const [revision, setRevision] = useState(0)

  const reload = useCallback(async () => {
    await refresh()
    setRevision((r) => r + 1)
  }, [refresh])

  const {
    results: searchResults,
    matchedQuery,
    ready: searchReady,
  } = useDataroomSearch(dataroomId, debouncedQuery, revision)

  // Exit search when navigating into another folder, so results don't linger
  // over the destination folder's contents.
  useEffect(() => {
    setQuery('')
  }, [currentFolderId])

  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Item | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [deleteDescription, setDeleteDescription] = useState('')
  const [viewFile, setViewFile] = useState<FileItem | null>(null)
  const [isDragging, setDragging] = useState(false)

  /* ---- Mutations ---- */

  const handleCreateFolder = async (name: string) => {
    await itemService.createFolder(dataroomId, currentFolderId, name)
    await dataroomService.touch(dataroomId)
    await reload()
    toast.success('Folder created')
  }

  const handleUpload = async (files: File[]) => {
    try {
      const { created, skipped } = await itemService.uploadFiles(
        dataroomId,
        currentFolderId,
        files,
      )
      if (created.length > 0) {
        await dataroomService.touch(dataroomId)
        await reload()
        toast.success(
          created.length === 1
            ? `Uploaded “${created[0].name}”`
            : `Uploaded ${created.length} files`,
        )
      }
      if (skipped.length > 0) {
        toast.error(
          skipped.length === 1
            ? `${skipped[0].name}: ${skipped[0].reason}`
            : `${skipped.length} files skipped (only PDFs up to 50 MB are allowed)`,
        )
      }
    } catch (err) {
      // e.g. IndexedDB write failure / storage quota exceeded.
      console.error('Upload failed', err)
      toast.error('Upload failed — your files could not be saved. Please try again.')
    }
  }

  const handleRename = async (name: string) => {
    if (!renameTarget) return
    await itemService.rename(renameTarget.id, name)
    await reload()
    toast.success('Renamed')
  }

  /** Build a delete confirmation that spells out how much a folder will remove. */
  const openDelete = async (item: Item) => {
    if (isFolder(item)) {
      const { folders, files } = await itemService.countDescendants(item.id)
      const parts: string[] = []
      if (folders > 0) parts.push(`${folders} folder${folders === 1 ? '' : 's'}`)
      if (files > 0) parts.push(`${files} file${files === 1 ? '' : 's'}`)
      setDeleteDescription(
        parts.length > 0
          ? `This folder and everything inside it (${parts.join(
              ' and ',
            )}) will be permanently deleted. This cannot be undone.`
          : 'This folder will be permanently deleted. This cannot be undone.',
      )
    } else {
      setDeleteDescription('This file will be permanently deleted. This cannot be undone.')
    }
    setDeleteTarget(item)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await itemService.delete(deleteTarget.id)
    await reload()
    toast.success(`“${deleteTarget.name}” deleted`)
  }

  const handleOpen = (item: Item) => {
    if (isFolder(item)) {
      navigate(`/d/${dataroomId}/f/${item.id}`)
    } else {
      setViewFile(item)
    }
  }

  const handleDownload = async (item: Item) => {
    try {
      const blob = await itemService.getFileBlob(item.id)
      if (!blob) {
        toast.error('This file could not be found.')
        return
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = item.name
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      // Defer revocation: some browsers (Firefox, older Safari) fetch the blob
      // asynchronously, so revoking on the same tick can cancel the download.
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (err) {
      // e.g. IndexedDB read failure.
      console.error('Download failed', err)
      toast.error('Could not download this file. Please try again.')
    }
  }

  /* ---- Drag & drop upload ---- */

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const files = Array.from(event.dataTransfer.files ?? [])
    if (files.length > 0) void handleUpload(files)
  }

  const { folderCount, fileCount } = useMemo(
    () => ({
      folderCount: items.filter(isFolder).length,
      fileCount: items.filter(isFile).length,
    }),
    [items],
  )

  /* ---- Render states ---- */

  if (status === 'loading') return <DataroomPageSkeleton />

  if (status === 'not-found') {
    return (
      <CenteredMessage
        title="Not found"
        description="This dataroom or folder doesn't exist. It may have been deleted."
      />
    )
  }

  if (status === 'error') {
    return (
      <CenteredMessage
        title="Something went wrong"
        description="We couldn't load this folder."
        action={
          <Button variant="outline" onClick={() => void refresh()}>
            Try again
          </Button>
        }
      />
    )
  }

  return (
    <div
      className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={(e) => {
        // Only clear when the cursor actually leaves the container.
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setDragging(false)
      }}
      onDrop={handleDrop}
    >
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DataroomBreadcrumbs
            dataroomId={dataroomId}
            dataroomName={dataroom?.name ?? 'Dataroom'}
            trail={breadcrumbs}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus />
              New folder
            </Button>
            <UploadButton onFiles={handleUpload} />
          </div>
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search this dataroom…"
          ariaLabel="Search this dataroom"
          className="sm:max-w-xs"
        />
      </div>

      {isSearching ? (
        <SearchResults
          results={searchResults}
          query={matchedQuery}
          ready={searchReady}
          dataroomName={dataroom?.name ?? 'Dataroom'}
          onOpen={handleOpen}
          onRename={setRenameTarget}
          onDelete={openDelete}
          onDownload={handleDownload}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="This folder is empty"
          description="Create a folder or drag & drop PDF files here to upload them."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
                <FolderPlus />
                New folder
              </Button>
              <UploadButton onFiles={handleUpload} />
            </div>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {folderCount > 0 && `${folderCount} folder${folderCount === 1 ? '' : 's'}`}
            {folderCount > 0 && fileCount > 0 && ' · '}
            {fileCount > 0 && `${fileCount} file${fileCount === 1 ? '' : 's'}`}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onOpen={handleOpen}
                onRename={setRenameTarget}
                onDelete={openDelete}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 text-primary">
          <UploadCloud className="size-8" />
          <p className="mt-2 text-sm font-medium">Drop PDF files to upload</p>
        </div>
      )}

      <NameDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        title="New folder"
        label="Folder name"
        placeholder="e.g. Financials"
        submitLabel="Create"
        onSubmit={handleCreateFolder}
      />

      <NameDialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title={renameTarget && isFolder(renameTarget) ? 'Rename folder' : 'Rename file'}
        label="Name"
        initialValue={renameTarget?.name ?? ''}
        submitLabel="Rename"
        onSubmit={handleRename}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete “${deleteTarget?.name}”?`}
        description={deleteDescription}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />

      <PdfViewerDialog file={viewFile} onOpenChange={(open) => !open && setViewFile(null)} />
    </div>
  )
}
