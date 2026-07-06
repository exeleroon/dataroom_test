import { useEffect, useState } from 'react'
import { Download, FileWarning, Loader2 } from 'lucide-react'

import type { FileItem } from '@/types'
import { formatBytes } from '@/lib/format'
import { itemService } from '@/services/itemService'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PdfViewerDialogProps {
  file: FileItem | null
  onOpenChange: (open: boolean) => void
}

/**
 * Full-height dialog that renders a stored PDF via an object URL. The URL is
 * created when a file opens and revoked on close to avoid leaking blob memory.
 */
export function PdfViewerDialog({ file, onOpenChange }: PdfViewerDialogProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    if (!file) return

    let objectUrl: string | null = null
    let cancelled = false
    setStatus('loading')
    setUrl(null)

    itemService
      .getFileBlob(file.id)
      .then((blob) => {
        if (cancelled) return
        if (!blob) {
          setStatus('missing')
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('missing'))

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  const handleDownload = () => {
    if (!url || !file) return
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
  }

  return (
    <Dialog open={file !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b p-4 pr-14 text-left">
          <div className="min-w-0">
            <DialogTitle className="truncate" title={file?.name}>
              {file?.name}
            </DialogTitle>
            {file && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatBytes(file.size)} · PDF
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={status !== 'ready'}
          >
            <Download />
            Download
          </Button>
        </DialogHeader>

        <div className="min-h-0 flex-1 bg-muted">
          {status === 'loading' && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
          {status === 'missing' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileWarning className="size-8" />
              <p className="text-sm">This file's contents could not be found.</p>
            </div>
          )}
          {status === 'ready' && url && (
            <iframe src={url} title={file?.name ?? 'PDF preview'} className="size-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
