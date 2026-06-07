import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ReloadPrompt from './ReloadPrompt.jsx'
import SafeAreaDebug from './SafeAreaDebug.jsx'

// Android-PWA: Nach einem (Service-Worker-)Reload uebernimmt die WebView die
// System-Insets (Status-/Navigationsleiste) nicht erneut – Floating-Buttons
// rutschen hinter die Navigationsleiste, bis die App neu gestartet wird.
// Erneutes Setzen des viewport-Meta (kurzer Wechsel von viewport-fit) zwingt
// die WebView zur Neuberechnung der safe-area-Insets.
function refreshViewportFit() {
  const vp = document.querySelector('meta[name="viewport"]')
  if (!vp) return
  const base = vp.getAttribute('content')
  if (!base.includes('viewport-fit=cover')) return
  vp.setAttribute('content', base.replace('viewport-fit=cover', 'viewport-fit=auto'))
  setTimeout(() => vp.setAttribute('content', base), 60)
}
window.addEventListener('pageshow', refreshViewportFit)
window.addEventListener('load', refreshViewportFit)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ReloadPrompt />
    {window.location.search.includes('debug') && <SafeAreaDebug />}
  </StrictMode>,
)
