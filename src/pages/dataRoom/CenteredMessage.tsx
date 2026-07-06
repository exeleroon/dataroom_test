import { Link } from 'react-router-dom'
import { Home, Inbox } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

interface CenteredMessageProps {
  title: string
  description: string
  /** Overrides the default "Back to datarooms" link (e.g. a retry button). */
  action?: React.ReactNode
}

/** Full-width empty state for the dataroom page's not-found / error screens. */
export function CenteredMessage({ title, description, action }: CenteredMessageProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <EmptyState
        icon={Inbox}
        title={title}
        description={description}
        action={
          action ?? (
            <Button asChild variant="outline">
              <Link to="/">
                <Home />
                Back to datarooms
              </Link>
            </Button>
          )
        }
      />
    </div>
  )
}