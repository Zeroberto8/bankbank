import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ReloadPrompt from './ReloadPrompt.jsx'

// Android-PWA: Nach einem Service-Worker-Reload ("Aktualisieren") rendert die
// WebView Vollbild und blendet den Platz der Navigationsleiste nicht mehr aus –
// die Floating-Buttons (u.a. der Liste-Button) verschwinden dahinter, bis die
// App neu gestartet wird. env(safe-area-inset-bottom) ist auf Android mit
// 3-Tasten-Leiste 0 und hilft hier nicht.
//
// Loesung: Nur nach einem Reload (navigation type "reload") einen festen
// Abstand --nav-pad setzen, der die Navigationsleiste freihaelt. Bei einem
// normalen App-Start (cold start) ist die WebView korrekt eingepasst -> kein
// Abstand. Bewusst kein gespeicherter Referenzwert, da dieser driften und den
// Abstand faelschlich auf 0 ziehen kann.
function setupNavBarPadding() {
  const navEntry = performance.getEntriesByType('navigation')[0]
  const isReload = navEntry ? navEntry.type === 'reload' : false
  document.documentElement.style.setProperty('--nav-pad', isReload ? '48px' : '0px')
  // Reste der frueheren Kalibrierung entfernen.
  try {
    localStorage.removeItem('bbGoodH_portrait')
    localStorage.removeItem('bbGoodH_landscape')
  } catch {}
}
setupNavBarPadding()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ReloadPrompt />
  </StrictMode>,
)
