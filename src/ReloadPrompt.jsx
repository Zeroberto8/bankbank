import { useRegisterSW } from "virtual:pwa-register/react";

// Zeigt einen Banner, sobald eine neue App-Version bereitsteht.
// Der Nutzer aktualisiert per Klick statt die App mehrfach schliessen zu muessen.
export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return;
      // Regelmaessig (stuendlich) und beim Zurueckkehren in die App nach Updates suchen,
      // damit der Banner erscheint, ohne dass der Nutzer die App komplett neu starten muss.
      setInterval(() => r.update(), 60 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") r.update();
      });
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1000,
        background: "#2D5016",
        color: "#fff",
        borderRadius: 14,
        padding: "12px 14px",
        boxShadow: "0 6px 24px rgba(0,0,0,.25)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>
        Neue Version verfügbar
      </span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          border: "none",
          background: "#fff",
          color: "#2D5016",
          borderRadius: 10,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Aktualisieren
      </button>
    </div>
  );
}
