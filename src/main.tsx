import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { fallbackIconUrl } from './data'
import { registerSW } from 'virtual:pwa-register'

// Offline support: the service worker updates itself in the background.
registerSW({ immediate: true })

// Some icons are missing from Enka's CDN; retry any failed game icon from the fallback CDN.
document.addEventListener(
  'error',
  (e) => {
    const img = e.target
    if (!(img instanceof HTMLImageElement)) return
    const next = fallbackIconUrl(img.src)
    if (next) img.src = next
  },
  true,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
