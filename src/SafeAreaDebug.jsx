import { useEffect, useState } from "react";

// Temporaeres Diagnose-Overlay. Nur sichtbar, wenn die URL "debug" enthaelt
// (z.B. https://.../?debug). Zeigt die fuer den Navigationsleisten-Bug
// relevanten Viewport-Werte – auch nach einem Service-Worker-Reload.
export default function SafeAreaDebug() {
  const [v, setV] = useState({});

  useEffect(() => {
    // Mess-Sonde fuer die tatsaechlich angewendeten safe-area-Insets.
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)";
    document.body.appendChild(probe);

    const read = () => {
      const cs = getComputedStyle(probe);
      setV({
        innerH: window.innerHeight,
        vvH: window.visualViewport ? Math.round(window.visualViewport.height) : "—",
        screenH: window.screen?.height,
        insetTop: cs.paddingTop,
        insetBottom: cs.paddingBottom,
        standalone:
          window.matchMedia("(display-mode: standalone)").matches ||
          window.navigator.standalone === true,
      });
    };
    read();
    window.addEventListener("resize", read);
    window.visualViewport?.addEventListener("resize", read);
    const iv = setInterval(read, 1000);
    return () => {
      window.removeEventListener("resize", read);
      window.visualViewport?.removeEventListener("resize", read);
      clearInterval(iv);
      probe.remove();
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 99999,
        background: "rgba(0,0,0,.8)",
        color: "#0f0",
        font: "11px/1.4 monospace",
        padding: "6px 8px",
        borderRadius: 8,
        pointerEvents: "none",
        whiteSpace: "pre",
      }}
    >
      {`innerH: ${v.innerH}
vvH:    ${v.vvH}
screenH:${v.screenH}
inTop:  ${v.insetTop}
inBot:  ${v.insetBottom}
standalone: ${v.standalone}`}
    </div>
  );
}
