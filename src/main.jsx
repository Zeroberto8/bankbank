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
// Loesung: Bei einem normalen Start (navigation type != "reload") ist die
// Fensterhoehe korrekt -> pro Ausrichtung als Referenz speichern. Nach einem
// Reload ist die Fensterhoehe groesser; die Differenz entspricht der Hoehe der
// Navigationsleiste und wird als zusaetzlicher Abstand --nav-pad gesetzt.
function setupNavBarPadding() {
  const root = document.documentElement
  const FALLBACK = 48 // px, solange noch keine eigene Referenz vorliegt
  const navEntry = performance.getEntriesByType('navigation')[0]
  const isReload = navEntry ? navEntry.type === 'reload' : false

  const orientationKey = () =>
    window.innerWidth < window.innerHeight ? 'bbGoodH_portrait' : 'bbGoodH_landscape'
  const currentHeight = () =>
    Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight)

  const apply = () => {
    if (isReload) {
      const base = parseFloat(localStorage.getItem(orientationKey()) || '0')
      const diff = base > 0 ? currentHeight() - base : NaN
      const pad = Number.isFinite(diff) && diff > 4 ? Math.round(diff) : base > 0 ? 0 : FALLBACK
      root.style.setProperty('--nav-pad', pad + 'px')
    } else {
      // Guter Zustand: Referenzhoehe merken, kein zusaetzlicher Abstand.
      localStorage.setItem(orientationKey(), String(currentHeight()))
      root.style.setProperty('--nav-pad', '0px')
    }
  }

  apply()
  // Nur bei Ausrichtungswechsel neu berechnen (nicht bei jedem resize, sonst
  // wuerde die eingeblendete Tastatur die Referenzhoehe verfaelschen).
  window.addEventListener('orientationchange', () => setTimeout(apply, 300))
  // Nach einem Reload steht die endgueltige Hoehe evtl. erst kurz spaeter fest.
  if (isReload) setTimeout(apply, 300)
}
setupNavBarPadding()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ReloadPrompt />
  </StrictMode>,
)
