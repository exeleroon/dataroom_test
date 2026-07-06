import { useRef } from 'react'
import { Upload } from 'lucide-react'

import { ACCEPTED_FILE_EXTENSIONS, ACCEPTED_FILE_TYPES } from '@/constants'
import { Button } from '@/components/ui/button'

interface UploadButtonProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

/** "Upload" button backed by a hidden, PDF-restricted, multi-select file input. */
export function UploadButton({ onFiles, disabled }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) onFiles(files)
    // Reset so selecting the same file again still fires onChange.
    event.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED_FILE_TYPES, ...ACCEPTED_FILE_EXTENSIONS].join(',')}
        multiple
        hidden
        onChange={handleChange}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={disabled}>
        <Upload />
        Upload PDF
      </Button>
    </>
  )
}
