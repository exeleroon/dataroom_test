import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * App-level safety net: catches render/lifecycle errors anywhere below it so an
 * unexpected crash degrades to a recoverable message instead of a blank white
 * screen. React error boundaries must be class components.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for debugging; a real app would forward this to an error tracker.
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-6 sm:px-6">
        <EmptyState
          icon={TriangleAlert}
          title="Something went wrong"
          description="An unexpected error occurred. Reloading the page usually fixes it."
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          }
          className="w-full"
        />
      </div>
    )
  }
}