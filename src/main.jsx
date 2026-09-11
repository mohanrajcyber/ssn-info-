import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { DataProvider } from './data/DataContext'
import ErrorBoundary from './ErrorBoundary'
import App from './App'
import './index.css'

const rootEl = document.getElementById('root')

try {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <DataProvider>
            <App />
          </DataProvider>
        </HashRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
  window.__SSN_READY = true
} catch (err) {
  window.__SSN_READY = false
  rootEl.innerHTML = `<div style="padding:24px;font-family:sans-serif"><h1>Failed to start</h1><p>${String(err?.message || err)}</p><button onclick="location.reload()">Reload</button></div>`
}
