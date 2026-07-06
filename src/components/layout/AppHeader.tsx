import { Link } from 'react-router-dom'
import { FolderLock } from 'lucide-react'

import { APP_NAME } from '@/constants'

/** Slim top bar shown on every page; the logo links back to the datarooms list. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FolderLock className="size-4" />
          </span>
          <span>{APP_NAME}</span>
        </Link>
      </div>
    </header>
  )
}
