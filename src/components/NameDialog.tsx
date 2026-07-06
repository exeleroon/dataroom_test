import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  label?: string
  placeholder?: string
  initialValue?: string
  submitLabel?: string
  /**
   * Persist the value. Throw an Error to surface its message inline (e.g. a
   * duplicate-name collision) and keep the dialog open.
   */
  onSubmit: (value: string) => Promise<void>
}

/**
 * Single-field dialog reused for creating datarooms/folders and renaming any
 * entity. Centralising it keeps validation, focus and pending states consistent.
 */
export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  label = 'Name',
  placeholder,
  initialValue = '',
  submitLabel = 'Save',
  onSubmit,
}: NameDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Reset the field whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setValue(initialValue)
      setError(null)
      setPending(false)
    }
  }, [open, initialValue])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Please enter a name.')
      return
    }

    setPending(true)
    setError(null)
    try {
      await onSubmit(trimmed)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="name-dialog-input">{label}</Label>
            <Input
              id="name-dialog-input"
              value={value}
              placeholder={placeholder}
              autoFocus
              // Select existing text so renames can be typed over immediately.
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                setValue(e.target.value)
                if (error) setError(null)
              }}
              aria-invalid={error ? true : undefined}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !value.trim()}>
              {pending ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
