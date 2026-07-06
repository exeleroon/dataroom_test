import { Link } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button asChild>
            <Link to="/">
              <Home />
              Back to datarooms
            </Link>
          </Button>
        }
      />
    </div>
  )
}
