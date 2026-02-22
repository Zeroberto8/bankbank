import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const BENCHES = [
  { id: 1, lat: 52.52, lng: 13.405, title: "Tiergarten Lieblingsbank", description: "Wunderschöne Bank am See mit Blick auf die Fontäne. Perfekt für die Mittagspause.", photo: null, user: "Anna M.", date: "2025-01-15", ratings: [5, 4, 5, 4], comments: [{ user: "Tom K.", text: "Mein absoluter Lieblingsplatz! 🌿", date: "2025-01-20", rating: 5 }, { user: "Lisa R.", text: "Sehr ruhig und schattig im Sommer.", date: "2025-02-01", rating: 4 }] },
  { id: 2, lat: 48.137, lng: 11.575, title: "Englischer Garten Panorama", description: "Holzbank auf dem kleinen Hügel mit 360° Blick über den Park.", photo: null, user: "Max B.", date: "2025-02-03", ratings: [5, 5, 5], comments: [{ user: "Sarah W.", text: "Sonnenuntergang hier ist magisch! 🌅", date: "2025-02-10", rating: 5 }] },
  { id: 3, lat: 50.938, lng: 6.96, title: "Rheinufer Köln Deutz", description: "Moderne Bank direkt am Rhein mit Blick auf den Dom.", photo: null, user: "Julia F.", date: "2025-01-28", ratings: [4, 5, 4, 5, 4], comments: [{ user: "Chris P.", text: "Perfekter Spot für ein Feierabendbier.", date: "2025-02-05", rating: 4 }] },
  { id: 4, lat: 53.551, lng: 9.994, title: "Alster-Uferbank", description: "Klassische weiße Holzbank an der Außenalster. Segelboote beobachten inklusive.", photo: null, user: "Henrik S.", date: "2025-01-10", ratings: [5, 4, 5], comments: [] },
  { id: 5, lat: 51.34, lng: 12.373, title: "Clara-Zetkin-Park Lesebank", description: "Versteckte Bank zwischen alten Eichen.", photo: null, user: "Mia T.", date: "2025-02-08", ratings: [5, 5, 4, 5], comments: [{ user: "Paul D.", text: "Geheimtipp!", date: "2025-02-14", rating: 5 }] },
  { id: 6, lat: 48.775, lng: 9.183, title: "Schlossplatz Stuttgart", description: "Steinbank mit Blick auf das Neue Schloss.", photo: null, user: "Lena K.", date: "2025-02-10", ratings: [4, 4, 5], comments: [] },
  { id: 7, lat: 51.05, lng: 13.738, title: "Elbwiesen Dresden", description: "Holzbank mit Blick auf die Altstadt-Silhouette.", photo: null, user: "Felix W.", date: "2025-01-22", ratings: [5, 5, 5, 4], comments: [] },
  { id: 8, lat: 49.453, lng: 11.077, title: "Burggarten Nürnberg", description: "Alte Steinbank mit Panoramablick.", photo: null, user: "Jan H.", date: "2025-02-15", ratings: [4, 5, 4], comments: [] },
];

const avg = (r) => r.length ? (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1) : "–";

const Stars = ({ rating, size = 16, interactive, onRate }) => {
  const [h, setH] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} onClick={() => interactive && onRate?.(s)}
          onMouseEnter={() => interactive && setH(s)} onMouseLeave={() => interactive && setH(0)}
          style={{ fontSize: size, cursor: interactive ? "pointer" : "default",
            color: s <= (h || rating) ? "#E8A838" : "#D1C7B7" }}>★</span>
      ))}
    </div>
  );
};

const T = { bg: "#F7F3ED", pri: "#4A7C28", priDk: "#2D5016", acc: "#E8A838", txt: "#2C2416", mut: "#8C7E6A", brd: "#E8E0D4" };
const btnStyle = { width: 44, height: 44, borderRadius: 12, border: "none", fontSize: 18, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" };

// Mercator projection helpers
const lat2world = (lat) => {
  const r = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};
const world2lat = (y) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI;

export default function App() {
  const [benches, setBenches] = useState(BENCHES);
  const [view, setView] = useState("map");
  const [sel, setSel] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [newPos, setNewPos] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPhoto, setNewPhoto] = useState(null);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [userPos, setUserPos] = useState(null);

  // Map state
  const [cLng, setCLng] = useState(10.4);
  const [cLat, setCLat] = useState(51.2);
  const [zoom, setZoom] = useState(6);
  const [mapSize, setMapSize] = useState({ w: 400, h: 600 });
  const mapRef = useRef(null);
  const dragRef = useRef(null);
  const touchRef = useRef(null);
  const zoomRef = useRef(6);
  const [flewToUser, setFlewToUser] = useState(false);

  zoomRef.current = zoom;
  const worldSize = 256 * Math.pow(2, zoom);

  // Measure map container
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const m = () => setMapSize({ w: el.clientWidth, h: el.clientHeight });
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) { setUserPos({ lat: 50.11, lng: 8.68 }); return; }
    navigator.geolocation.getCurrentPosition(
      p => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setUserPos({ lat: 50.11, lng: 8.68 }),
      { enableHighAccuracy: true, timeout: 5000 }
    );
    const id = navigator.geolocation.watchPosition(
      p => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Fly to user on first GPS fix
  useEffect(() => {
    if (userPos && !flewToUser && mapSize.w > 50) {
      setCLat(userPos.lat); setCLng(userPos.lng);
      setZoom(13);
      setFlewToUser(true);
    }
  }, [userPos, flewToUser, mapSize]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Mercator geo <-> pixel conversion
  const geo2px = useCallback((lat, lng) => {
    const cxW = (cLng + 180) / 360 * worldSize;
    const cyW = lat2world(cLat) * worldSize;
    const xW = (lng + 180) / 360 * worldSize;
    const yW = lat2world(lat) * worldSize;
    return { x: mapSize.w / 2 + (xW - cxW), y: mapSize.h / 2 + (yW - cyW) };
  }, [mapSize, cLng, cLat, worldSize]);

  const px2geo = useCallback((px, py) => {
    const cxW = (cLng + 180) / 360 * worldSize;
    const cyW = lat2world(cLat) * worldSize;
    const xW = cxW + (px - mapSize.w / 2);
    const yW = cyW + (py - mapSize.h / 2);
    return { lng: xW / worldSize * 360 - 180, lat: world2lat(yW / worldSize) };
  }, [mapSize, cLng, cLat, worldSize]);

  // Drag handlers (pointer events for mouse + single-finger touch)
  const onPtrDown = (e) => {
    if (e.target.closest("[data-pin]") || e.target.closest("[data-btn]")) return;
    if (touchRef.current?.type === "pinch") return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, sLng: cLng, sLat: cLat, moved: false };
    mapRef.current?.setPointerCapture(e.pointerId);
  };
  const onPtrMove = (e) => {
    if (!dragRef.current || touchRef.current?.type === "pinch") return;
    const dx = e.clientX - dragRef.current.sx, dy = e.clientY - dragRef.current.sy;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    const ws = 256 * Math.pow(2, zoomRef.current);
    const sxW = (dragRef.current.sLng + 180) / 360 * ws;
    const syW = lat2world(dragRef.current.sLat) * ws;
    setCLng((sxW - dx) / ws * 360 - 180);
    setCLat(world2lat((syW - dy) / ws));
  };
  const onPtrUp = (e) => {
    const wasDrag = dragRef.current?.moved;
    dragRef.current = null;
    if (!wasDrag && addMode && mapRef.current) {
      const r = mapRef.current.getBoundingClientRect();
      const g = px2geo(e.clientX - r.left, e.clientY - r.top);
      setNewPos(g); setAddMode(false); setView("add");
    }
  };

  // Wheel zoom
  const onWhl = (e) => {
    e.preventDefault();
    setZoom(prev => {
      const n = prev + (e.deltaY > 0 ? -0.3 : 0.3);
      return Math.max(4, Math.min(18, n));
    });
  };

  // Pinch-to-zoom (touch events)
  useEffect(() => {
    const el = mapRef.current;
    if (!el || view !== "map") return;

    const onTS = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchRef.current = { type: "pinch", dist, startZoom: zoomRef.current };
        dragRef.current = null;
      }
    };

    const onTM = (e) => {
      if (e.touches.length === 2 && touchRef.current?.type === "pinch") {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scale = dist / touchRef.current.dist;
        setZoom(Math.max(4, Math.min(18, touchRef.current.startZoom + Math.log2(scale))));
      }
    };

    const onTE = () => { touchRef.current = null; };

    el.addEventListener("touchstart", onTS, { passive: false });
    el.addEventListener("touchmove", onTM, { passive: false });
    el.addEventListener("touchend", onTE);

    return () => {
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove", onTM);
      el.removeEventListener("touchend", onTE);
    };
  }, [view]);

  // Compute visible tiles
  const tiles = useMemo(() => {
    const z = Math.max(0, Math.min(18, Math.round(zoom)));
    const numTiles = Math.pow(2, z);
    const tilePixelSize = worldSize / numTiles;

    const cxW = (cLng + 180) / 360 * worldSize;
    const cyW = lat2world(cLat) * worldSize;

    const tlWx = cxW - mapSize.w / 2;
    const tlWy = cyW - mapSize.h / 2;

    const startTx = Math.floor(tlWx / tilePixelSize);
    const startTy = Math.max(0, Math.floor(tlWy / tilePixelSize));
    const endTx = Math.ceil((tlWx + mapSize.w) / tilePixelSize);
    const endTy = Math.min(numTiles - 1, Math.ceil((tlWy + mapSize.h) / tilePixelSize));

    const result = [];
    const subs = ["a", "b", "c"];
    for (let tx = startTx; tx <= endTx; tx++) {
      for (let ty = startTy; ty <= endTy; ty++) {
        const wtx = ((tx % numTiles) + numTiles) % numTiles;
        const px = mapSize.w / 2 + (tx * tilePixelSize - cxW);
        const py = mapSize.h / 2 + (ty * tilePixelSize - cyW);
        const sub = subs[(wtx + ty) % 3];
        result.push({
          key: `${z}/${wtx}/${ty}`,
          url: `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${wtx}/${ty}@2x.png`,
          x: px, y: py, size: tilePixelSize,
        });
      }
    }
    return result;
  }, [zoom, cLng, cLat, mapSize, worldSize]);

  const addBench = () => {
    if (!newTitle.trim() || !newPos) return;
    setBenches(p => [...p, { id: Date.now(), ...newPos, title: newTitle, description: newDesc, photo: newPhoto, user: "Du", date: new Date().toISOString().split("T")[0], ratings: [5], comments: [] }]);
    setNewTitle(""); setNewDesc(""); setNewPhoto(null); setNewPos(null); setView("map");
    flash("🪑 Bank hinzugefügt!");
  };

  const addComment = () => {
    if (!comment.trim() || !rating || !sel) return;
    const u = benches.map(b => b.id === sel.id ? { ...b, ratings: [...b.ratings, rating], comments: [...b.comments, { user: "Du", text: comment, date: new Date().toISOString().split("T")[0], rating }] } : b);
    setBenches(u); setSel(u.find(b => b.id === sel.id));
    setComment(""); setRating(0); flash("⭐ Bewertung gespeichert!");
  };

  const onPhoto = (e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setNewPhoto(ev.target.result); r.readAsDataURL(f); } };

  const filtered = benches.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase()));

  const inp = { width: "100%", padding: 12, borderRadius: 12, border: `2px solid ${T.brd}`, fontSize: 14, fontFamily: "system-ui", background: "#fff", color: T.txt, outline: "none", boxSizing: "border-box" };
  const bk = { background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontFamily: "system-ui", cursor: "pointer", marginBottom: 14 };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: T.bg, color: T.txt, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        .pulse { animation: p 2s ease-out infinite; }
        @keyframes p { 0%{transform:scale(.5);opacity:.8} 100%{transform:scale(1.8);opacity:0} }
        input:focus,textarea:focus{border-color:${T.pri} !important}
      `}</style>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg,${T.priDk},${T.pri})`, color: "#fff", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🪑</span>
          <div><div style={{ fontSize: 18, fontWeight: 700 }}>BankBank</div>
            <div style={{ fontSize: 8, opacity: .75, letterSpacing: 1.5, textTransform: "uppercase" }}>Deutschlands schönste Bänke</div></div>
        </div>
        <div style={{ fontSize: 11, background: "rgba(255,255,255,.15)", padding: "3px 10px", borderRadius: 20 }}>{benches.length} Bänke</div>
      </div>

      {/* === MAP VIEW === */}
      {view === "map" && (
        <div ref={mapRef} style={{ flex: 1, position: "relative", overflow: "hidden", touchAction: "none", cursor: addMode ? "crosshair" : "grab", background: "#dce8f1", userSelect: "none" }}
          onPointerDown={onPtrDown} onPointerMove={onPtrMove} onPointerUp={onPtrUp} onWheel={onWhl}>

          {/* OSM Tiles */}
          {tiles.map(t => (
            <img key={t.key} src={t.url} alt="" draggable={false}
              style={{ position: "absolute", left: t.x, top: t.y, width: t.size, height: t.size, pointerEvents: "none", imageRendering: "auto" }}
            />
          ))}

          {/* Bench pins */}
          {benches.map(b => {
            const p = geo2px(b.lat, b.lng);
            if (p.x < -40 || p.x > mapSize.w + 40 || p.y < -60 || p.y > mapSize.h + 20) return null;
            const a = avg(b.ratings);
            return (
              <div key={b.id} data-pin="1" onClick={e => { e.stopPropagation(); setSel(b); setView("detail"); }}
                style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-100%)", cursor: "pointer", zIndex: 5 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.pri, border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🪑</div>
                  <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `8px solid ${T.pri}`, marginTop: -2 }} />
                  {a !== "–" && <div style={{ position: "absolute", top: -4, right: -8, background: T.acc, color: "#fff", borderRadius: 10, padding: "1px 5px", fontSize: 9, fontWeight: 700, border: "1.5px solid #fff" }}>{a}</div>}
                </div>
              </div>
            );
          })}

          {/* User position */}
          {userPos && (() => {
            const p = geo2px(userPos.lat, userPos.lng);
            return (p.x > -30 && p.x < mapSize.w + 30 && p.y > -30 && p.y < mapSize.h + 30) ? (
              <div style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)", zIndex: 6, pointerEvents: "none" }}>
                <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <div className="pulse" style={{ position: "absolute", width: 40, height: 40, borderRadius: "50%", background: "rgba(66,133,244,.15)" }} />
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#4285F4", border: "3px solid #fff", boxShadow: "0 1px 6px rgba(0,0,0,.3)", zIndex: 1 }} />
                </div>
              </div>
            ) : null;
          })()}

          {/* Buttons rechts unten */}
          <div data-btn="1" style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 20 }}>
            <button onClick={() => { setCLng(10.4); setCLat(51.2); setZoom(6); flash("🇩🇪 Ganz Deutschland"); }} style={{ ...btnStyle, background: "#fff", color: "#666" }}>🇩🇪</button>
            <button onClick={() => { if (userPos) { setCLat(userPos.lat); setCLng(userPos.lng); setZoom(13); flash("📍 Dein Standort"); } }} style={{ ...btnStyle, background: "#fff", color: userPos ? "#4285F4" : "#aaa" }}>◎</button>
            <button onClick={() => setAddMode(true)} style={{ ...btnStyle, background: "linear-gradient(135deg,#E8A838,#D4922A)", color: "#fff", fontSize: 22 }}>+</button>
          </div>

          {addMode && (
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: T.acc, color: "#fff", padding: "10px 20px", borderRadius: 30, fontSize: 13, fontWeight: 600, zIndex: 20, boxShadow: "0 4px 16px rgba(232,168,56,.4)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
              📍 Tippe auf die Karte
              <button onClick={() => setAddMode(false)} style={{ background: "rgba(0,0,0,.2)", border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 13 }}>×</button>
            </div>
          )}

          <div style={{ position: "absolute", bottom: 4, left: 4, fontSize: 8, color: "#666", background: "rgba(255,255,255,.7)", padding: "1px 4px", borderRadius: 3, zIndex: 10 }}>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: "#666" }}>OpenStreetMap</a> © <a href="https://carto.com/" target="_blank" rel="noreferrer" style={{ color: "#666" }}>CARTO</a></div>
        </div>
      )}

      {/* === DETAIL VIEW === */}
      {view === "detail" && sel && (
        <div style={{ flex: 1, overflow: "auto", background: T.bg }}>
          <div style={{ background: `linear-gradient(135deg,${T.priDk},${T.pri})`, color: "#fff", padding: "20px 16px 28px" }}>
            <button onClick={() => { setView("map"); setSel(null); }} style={bk}>← Zurück</button>
            <h2 style={{ margin: 0, fontSize: 20 }}>{sel.title}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, opacity: .9 }}>
              <Stars rating={Math.round(parseFloat(avg(sel.ratings)))} size={18} />
              <span style={{ fontSize: 13 }}>{avg(sel.ratings)} · {sel.ratings.length} Bewertungen</span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 11, opacity: .7 }}>📍 von {sel.user} · {sel.date}</p>
          </div>
          {sel.photo && <div style={{ margin: "0 16px", marginTop: -14 }}><img src={sel.photo} alt="" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 16 }} /></div>}
          <div style={{ padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: `1px solid ${T.brd}`, marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>Beschreibung</h3>
              <p style={{ margin: 0, fontSize: 13, color: T.mut, lineHeight: 1.5 }}>{sel.description}</p>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: `1px solid ${T.brd}`, marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Bewertung abgeben</h3>
              <Stars rating={rating} size={28} interactive onRate={setRating} />
              <textarea placeholder="Dein Kommentar..." value={comment} onChange={e => setComment(e.target.value)} style={{ ...inp, minHeight: 60, resize: "vertical", marginTop: 10 }} />
              <button onClick={addComment} disabled={!comment.trim() || !rating} style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "none", background: T.pri, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", opacity: (!comment.trim() || !rating) ? .5 : 1 }}>Absenden</button>
            </div>
            {sel.comments.length > 0 && <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Kommentare ({sel.comments.length})</h3>
              {sel.comments.map((c, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 12, border: `1px solid ${T.brd}`, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{c.user}</span><Stars rating={c.rating} size={11} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: T.mut }}>{c.text}</p>
                  <span style={{ fontSize: 10, color: T.mut }}>{c.date}</span>
                </div>
              ))}
            </div>}
          </div>
        </div>
      )}

      {/* === ADD FORM === */}
      {view === "add" && (
        <div style={{ flex: 1, overflow: "auto", background: T.bg }}>
          <div style={{ background: `linear-gradient(135deg,#B8860B,${T.acc})`, color: "#fff", padding: "20px 16px 28px" }}>
            <button onClick={() => { setView("map"); setNewPos(null); }} style={bk}>← Abbrechen</button>
            <h2 style={{ margin: 0, fontSize: 20 }}>🪑 Neue Bank</h2>
            {newPos && <p style={{ margin: "6px 0 0", fontSize: 12, opacity: .8 }}>📍 {newPos.lat.toFixed(4)}, {newPos.lng.toFixed(4)}</p>}
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Name *</label>
              <input type="text" placeholder="z.B. Sonnenbank am See" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inp} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Beschreibung</label>
              <textarea placeholder="Was macht sie besonders?" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ ...inp, minHeight: 60, resize: "vertical" }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Foto</label>
              {newPhoto ? (
                <div style={{ position: "relative" }}><img src={newPhoto} alt="" style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 12 }} />
                  <button onClick={() => setNewPhoto(null)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.6)", color: "#fff", border: "none", width: 26, height: 26, borderRadius: "50%", cursor: "pointer" }}>×</button></div>
              ) : (
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 80, border: `2px dashed ${T.brd}`, borderRadius: 12, cursor: "pointer", color: T.mut, fontSize: 13, gap: 4 }}>
                  <span style={{ fontSize: 24 }}>📷</span>Foto aufnehmen
                  <input type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{ display: "none" }} /></label>
              )}</div>
            <button onClick={addBench} disabled={!newTitle.trim() || !newPos} style={{ padding: 12, borderRadius: 12, border: "none", background: T.pri, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: (!newTitle.trim() || !newPos) ? .5 : 1 }}>Eintragen ✓</button>
          </div>
        </div>
      )}

      {/* === LIST VIEW === */}
      {view === "list" && (
        <div style={{ flex: 1, overflow: "auto", background: T.bg }}>
          <div style={{ padding: "12px 16px 6px" }}><input type="text" placeholder="🔍 Bank suchen..." value={search} onChange={e => setSearch(e.target.value)} style={inp} /></div>
          {filtered.length === 0 && <p style={{ textAlign: "center", color: T.mut, padding: 40 }}>Keine Bänke gefunden 🪑</p>}
          {[...filtered].sort((a, b) => parseFloat(avg(b.ratings)) - parseFloat(avg(a.ratings))).map(b => (
            <div key={b.id} onClick={() => { setSel(b); setView("detail"); }} style={{ background: "#fff", borderRadius: 14, margin: "8px 16px", padding: 14, border: `1px solid ${T.brd}`, cursor: "pointer" }}>
              <h3 style={{ margin: "0 0 3px", fontSize: 15 }}>{b.title}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><Stars rating={Math.round(parseFloat(avg(b.ratings)))} size={12} /><span style={{ fontSize: 11, color: T.mut }}>{avg(b.ratings)} · {b.comments.length} Kommentare</span></div>
              <p style={{ margin: 0, fontSize: 12, color: T.mut }}>{b.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* NAV */}
      <div style={{ display: "flex", background: "#fff", borderTop: `1px solid ${T.brd}`, padding: "4px 0 8px", flexShrink: 0 }}>
        {[["map","🗺️","Karte"],["list","📋","Liste"],["add","➕","Neu"],["profile","👤","Profil"]].map(([id, ic, lb]) => (
          <button key={id} onClick={() => { if (id === "add") { setAddMode(true); setView("map"); } else if (id === "profile") flash("Profil kommt bald! 👤"); else { setView(id); setAddMode(false); } }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "4px 0", background: "none", border: "none", color: view === id ? T.pri : T.mut, fontSize: 9, fontWeight: view === id ? 700 : 500, cursor: "pointer" }}>
            {id === "add" ? <span style={{ fontSize: 15, background: T.pri, color: "#fff", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</span> : <span style={{ fontSize: 18 }}>{ic}</span>}
            {lb}
          </button>
        ))}
      </div>

      {toast && <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", background: T.priDk, color: "#fff", padding: "10px 20px", borderRadius: 30, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,.2)", whiteSpace: "nowrap" }}>{toast}</div>}
    </div>
  );
}
