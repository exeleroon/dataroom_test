import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/index.css'
import App from '@/App'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const container = document.getElementById('app')
if (!container) {
  throw new Error("Root container element with id 'app' not found")
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
