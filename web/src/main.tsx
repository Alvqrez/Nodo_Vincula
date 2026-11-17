import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/geist'
import '@fontsource-variable/jetbrains-mono'
import App from '@/App'
import { ThemeProvider } from '@/theme'
import { DialogProvider } from '@/lib/dialog'
import { SessionProvider } from '@/lib/session'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <DialogProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </DialogProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
