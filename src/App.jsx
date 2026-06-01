import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./lib/supabase";

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

// Haversine-Distanz in km
const dist = (lat1, lng1, lat2, lng2) => {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const fmtDist = (km) => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

// Inhaltsmoderation: blockiert diskriminierende, rassistische und pornografische Begriffe
const BLOCKED_WORDS = [
  // Rassismus / Diskriminierung (DE)
  "neger", "nigger", "nigga", "kanake", "kanacke", "kümmeltürke", "kuemmeltuerke",
  "schlitzauge", "kameltreiber", "zigeuner", "zigeunerin", "polacke", "polack",
  "spaghettifresser", "itaker", "fidschifick", "hottentott", "bimbo",
  "untermenschen", "untermensch", "herrenvolk", "herrenrasse", "arier",
  "judensau", "judenschwein", "judenpack", "drecksjude", "saujude",
  "drecksausländer", "ausländerraus", "scheissausländer", "scheißausländer",
  // Rechtsextremismus
  "sieg heil", "siegheil", "heil hitler", "heilhitler", "white power", "whitepower",
  "volkstod", "rassenkrieg", "rassenkampf", "blut und ehre", "hakenkreuz",
  "reichskristallnacht", "drittes reich", "nsdap", "88", "1488",
  // Homophobie
  "schwuchtel", "schwuchteln", "tunte", "kampflesbe", "homo", "lesbe",
  "transe", "shemale",
  // Vulgär / sexuell explizit (DE)
  "fotze", "möse", "moese", "muschi", "titte", "titten", "geil", "geile", "geiler", "geiles", "geilem", "geilen",
  "hurensohn", "wichser", "wichse", "wichsen", "fick", "ficken", "ficker", "gefickt",
  "fick dich", "fickdich", "arschfick", "arschloch", "arschlöcher",
  "schwanz", "penis", "vagina", "anal", "orgasmus", "orgie",
  "blasen", "blowjob", "handjob", "gangbang", "deepthroat",
  "hardcore", "hentai", "porno", "pornostar", "sexslave", "sextoy",
  "dildo", "domina", "bdsm", "fetisch", "ejakulation", "sperma",
  "nackt", "nackig", "stripclub", "bordell", "freier",
  // Vulgär / sexuell explizit (EN)
  "fuck", "fucker", "fucking", "shit", "asshole", "bitch", "cunt", "dick",
  "pussy", "cock", "boobs", "tits", "slut", "whore", "porn",
  // Rassismus (EN)
  "wetback", "spic", "chink", "gook", "kike", "beaner", "cracker",
  "redneck", "white trash", "whitetrash", "coon",
  // Beleidigungen / Diskriminierung
  "hure", "nutte", "schlampe", "dreckschwein", "dreckssau", "drecksau",
  "missgeburt", "behindert", "behinderter", "behinderte",
  "spast", "spasti", "spastik", "mongo", "mongoloid",
  "vollidiot", "hurenkind", "bastard", "wixer",
  "depp", "trottel", "idiot", "kretin", "dumme sau",
  "scheisse", "scheiße", "kacke", "pisser", "pisse",
  "verrecken", "vergasen", "umbringen", "abstechen", "abknallen",
];

const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/[@]/g, "a")
    .replace(/[0ø]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3€]/g, "e")
    .replace(/[$5]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[8]/g, "b")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[_\-.*+]/g, "");
};

const containsBadWords = (text) => {
  if (!text) return false;
  const normalized = normalizeText(text);
  return BLOCKED_WORDS.some(w => normalized.includes(normalizeText(w)));
};

const T = { bg: "#F7F3ED", pri: "#4A7C28", priDk: "#2D5016", acc: "#E8A838", txt: "#2C2416", mut: "#8C7E6A", brd: "#E8E0D4" };
const btnStyle = { width: 44, height: 44, borderRadius: 12, border: "none", fontSize: 18, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" };

// Foto komprimieren: max 800px, JPEG Qualität 0.7 (~50-150 KB statt 5-11 MB)
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      let { width: w, height: h } = img;
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Komprimierung fehlgeschlagen"))),
        "image/jpeg",
        0.7
      );
    };
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    img.src = URL.createObjectURL(file);
  });

// Mercator projection helpers
const lat2world = (lat) => {
  const r = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};
const world2lat = (y) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI;

export default function App() {
  const [benches, setBenches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [view, setView] = useState("map");
  const [sel, setSel] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [newPos, setNewPos] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPhoto, setNewPhoto] = useState(null);
  const [newRating, setNewRating] = useState(0);
  const [newUser, setNewUser] = useState(() => localStorage.getItem("bankbank_user") || "");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  // Review (Kommentar+Bewertung zu bestehender Bank)
  const [revRating, setRevRating] = useState(0);
  const [revText, setRevText] = useState("");
  const [revUser, setRevUser] = useState(() => localStorage.getItem("bankbank_user") || "");
  const [revSubmitting, setRevSubmitting] = useState(false);
  const [revPhoto, setRevPhoto] = useState(null);
  const revSubmittingRef = useRef(false);
  // Admin state
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");
  const [editBench, setEditBench] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [adminSort, setAdminSort] = useState("date"); // date | user | distance | rating
  const [adminDetail, setAdminDetail] = useState(null); // gewählte Bank für Admin-Detailansicht

  // Hash-basierter Admin-Zugang: #admin in der URL öffnet das Admin-Panel
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#admin") {
        setView("admin");
      }
    };
    checkHash(); // Beim Laden prüfen
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  // Smartphone-/Browser-Zurück-Taste: zwischen Views navigieren statt App zu schließen
  const popNavigatingRef = useRef(false);
  useEffect(() => {
    const onPop = (e) => {
      popNavigatingRef.current = true;
      const target = e.state?.view || "map";
      setView(target);
      if (target !== "detail") setSel(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Bei jedem View-Wechsel (außer bei Zurück-Taste) einen History-Eintrag pushen,
  // damit die Zurück-Taste danach wieder zum vorherigen View führt
  useEffect(() => {
    if (popNavigatingRef.current) {
      popNavigatingRef.current = false;
      return;
    }
    if (view === "map") return; // Start-View, kein Push nötig
    if (window.history.state?.view === view) return; // keine Duplikate
    window.history.pushState({ view }, "");
  }, [view]);

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

  // Bänke laden (nur Marker-Daten, keine Kommentare)
  const fetchBenches = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("benches")
        .select("id, title, description, lat, lng, user_name, created_at, photo_url, comments(id, user_name, rating, text, created_at, photo_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBenches(data.map(b => {
        const cms = b.comments || [];
        return {
          id: b.id, lat: b.lat, lng: b.lng,
          title: b.title,
          description: b.description || "",
          photo: b.photo_url || null,
          user: b.user_name,
          date: new Date(b.created_at).toISOString().split("T")[0],
          ratings: cms.map(c => c.rating),
          comments: cms
            .filter(c => c.text || c.photo_url)
            .map(c => ({
              id: c.id,
              user: c.user_name,
              text: c.text,
              rating: c.rating,
              photo: c.photo_url || null,
              date: new Date(c.created_at).toISOString().split("T")[0],
            })),
        };
      }));
    } catch (e) {
      console.error("Fehler beim Laden:", e);
      setFetchError(`Fehler beim Laden der Bänke: ${e.message}`);
    }
    setLoading(false);
  }, []);

  // Kommentare + Foto für eine einzelne Bank nachladen (bei Klick)
  const [detailLoading, setDetailLoading] = useState(false);
  const fetchCommentsFor = useCallback(async (bench) => {
    setDetailLoading(true);
    try {
      // Kommentare und Foto parallel laden
      const [commentsRes, photoRes] = await Promise.all([
        supabase.from("comments").select("id, user_name, text, rating, created_at, photo_url").eq("bench_id", bench.id),
        bench.photo ? Promise.resolve(null) : supabase.from("benches").select("photo_url").eq("id", bench.id).single(),
      ]);

      const data = commentsRes.data;
      const photo = bench.photo || photoRes?.data?.photo_url || null;

      if (!commentsRes.error && data) {
        const updated = {
          ...bench,
          photo,
          ratings: data.map(c => c.rating),
          comments: data.filter(c => c.text || c.photo_url).map(c => ({
            id: c.id, user: c.user_name, text: c.text,
            rating: c.rating,
            photo: c.photo_url || null,
            date: new Date(c.created_at).toISOString().split("T")[0],
          })),
        };
        setSel(updated);
        setBenches(prev => prev.map(b => b.id === bench.id ? updated : b));
      }
    } catch (e) {
      console.error("Kommentare laden fehlgeschlagen:", e);
    }
    setDetailLoading(false);
  }, []);

  // Bank auswählen und Kommentare nachladen
  const selectBench = useCallback((bench) => {
    setSel(bench);
    setView("detail");
    fetchCommentsFor(bench);
  }, [fetchCommentsFor]);

  // Beim Start laden
  useEffect(() => { fetchBenches(); }, [fetchBenches]);

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
  const onPtrUp = () => {
    dragRef.current = null;
  };

  // Wheel zoom
  const onWhl = (e) => {
    e.preventDefault();
    setZoom(prev => {
      const n = prev + (e.deltaY > 0 ? -0.3 : 0.3);
      return Math.max(4, Math.min(17, n));
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
        setZoom(Math.max(4, Math.min(17, touchRef.current.startZoom + Math.log2(scale))));
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
    const z = Math.max(0, Math.min(17, Math.round(zoom)));
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
          url: `https://${sub}.tile.opentopomap.org/${z}/${wtx}/${ty}.png`,
          x: px, y: py, size: tilePixelSize,
        });
      }
    }
    return result;
  }, [zoom, cLng, cLat, mapSize, worldSize]);

  const addBench = async () => {
    if (submittingRef.current) return;
    if (!newTitle.trim() || !newUser.trim() || !newPos || !newRating || !newDesc.trim() || !newPhoto) return;

    // Inhaltsmoderation
    if (containsBadWords(newTitle) || containsBadWords(newDesc) || containsBadWords(newUser)) {
      flash("⚠️ Dein Eintrag enthält unangemessene Begriffe und kann nicht gespeichert werden.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      // Foto in Supabase Storage hochladen (falls vorhanden)
      let photoUrl = null;
      if (newPhoto?.blob) {
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("bench-photos")
          .upload(fileName, newPhoto.blob, { contentType: "image/jpeg", cacheControl: "31536000" });

        if (uploadError) {
          console.error("Foto-Upload fehlgeschlagen:", uploadError);
        } else {
          const { data: urlData } = supabase.storage.from("bench-photos").getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from("benches")
        .insert({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          lat: newPos.lat,
          lng: newPos.lng,
          photo_url: photoUrl,
          user_name: newUser.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error("Fehler beim Speichern:", error);
        flash("Fehler beim Speichern!");
        return;
      }

      // Bewertung vom Ersteller einfügen
      await supabase.from("comments").insert({
        bench_id: data.id,
        user_name: newUser.trim(),
        rating: newRating,
        text: null,
      });

      localStorage.setItem("bankbank_user", newUser.trim());
      if (newPhoto?.preview) URL.revokeObjectURL(newPhoto.preview);
      setNewTitle(""); setNewDesc(""); setNewPhoto(null); setNewRating(0); setNewPos(null); setView("map");
      flash("🪑 Bank hinzugefügt!");
      fetchBenches();
    } catch (e) {
      console.error("Fehler:", e);
      flash("Fehler beim Speichern!");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Bewertung/Kommentar zu bestehender Bank hinzufügen
  const addReview = async () => {
    if (revSubmittingRef.current) return;
    if (!sel || !revUser.trim() || !revRating || !revText.trim() || !revPhoto) return;

    if (containsBadWords(revUser) || containsBadWords(revText)) {
      flash("⚠️ Dein Kommentar enthält unangemessene Begriffe und kann nicht gespeichert werden.");
      return;
    }

    revSubmittingRef.current = true;
    setRevSubmitting(true);
    try {
      // Foto in Supabase Storage hochladen (falls vorhanden)
      let photoUrl = null;
      if (revPhoto?.blob) {
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("bench-photos")
          .upload(fileName, revPhoto.blob, { contentType: "image/jpeg", cacheControl: "31536000" });

        if (uploadError) {
          console.error("Foto-Upload fehlgeschlagen:", uploadError);
        } else {
          const { data: urlData } = supabase.storage.from("bench-photos").getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("comments").insert({
        bench_id: sel.id,
        user_name: revUser.trim(),
        rating: revRating,
        text: revText.trim() || null,
        photo_url: photoUrl,
      });
      if (error) {
        console.error("Fehler beim Speichern der Bewertung:", error);
        flash("Fehler beim Speichern!");
        return;
      }
      localStorage.setItem("bankbank_user", revUser.trim());
      setRevRating(0);
      setRevText("");
      if (revPhoto?.preview) URL.revokeObjectURL(revPhoto.preview);
      setRevPhoto(null);
      flash("⭐ Bewertung gespeichert!");
      // Detail neu laden, damit Mittelwert + Liste aktuell sind
      await fetchCommentsFor(sel);
      // Marker-Liste auch aktualisieren (Mittelwert in Karte/Liste)
      fetchBenches();
    } catch (e) {
      console.error("Fehler:", e);
      flash("Fehler beim Speichern!");
    } finally {
      revSubmittingRef.current = false;
      setRevSubmitting(false);
    }
  };

  // Admin: Bank löschen
  const deleteBench = async (id) => {
    const { error } = await supabase.from("benches").delete().eq("id", id);
    if (error) { flash("Fehler beim Löschen!"); return; }
    flash("🗑️ Bank gelöscht!");
    fetchBenches();
  };

  // Admin: Bank bearbeiten
  const updateBench = async () => {
    if (!editBench || !editTitle.trim()) return;
    const { error } = await supabase.from("benches").update({
      title: editTitle.trim(),
      description: editDesc.trim() || null,
    }).eq("id", editBench.id);
    if (error) { flash("Fehler beim Speichern!"); return; }
    setEditBench(null); setEditTitle(""); setEditDesc("");
    flash("✅ Bank aktualisiert!");
    fetchBenches();
  };

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const blob = await compressImage(f);
      const preview = URL.createObjectURL(blob);
      setNewPhoto({ blob, preview });
    } catch (err) {
      console.error("Foto-Komprimierung fehlgeschlagen:", err);
      flash("Foto konnte nicht verarbeitet werden.");
    }
  };

  const onRevPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const blob = await compressImage(f);
      const preview = URL.createObjectURL(blob);
      setRevPhoto({ blob, preview });
    } catch (err) {
      console.error("Foto-Komprimierung fehlgeschlagen:", err);
      flash("Foto konnte nicht verarbeitet werden.");
    }
  };

  const filtered = benches.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase()));

  // Sortierte Liste (nach Distanz, falls GPS-Position vorhanden) – wird in Listenansicht
  // und für die Swipe-Navigation in der Detailansicht verwendet
  const sortedList = useMemo(() => {
    const arr = [...filtered];
    if (userPos) arr.sort((a, b) => dist(userPos.lat, userPos.lng, a.lat, a.lng) - dist(userPos.lat, userPos.lng, b.lat, b.lng));
    return arr;
  }, [filtered, userPos]);

  // Swipe in Detailansicht: links = nächste Bank, rechts = vorherige Bank
  const swipeRef = useRef(null);
  const onDetailTouchStart = (e) => {
    const t = e.touches[0];
    swipeRef.current = { sx: t.clientX, sy: t.clientY };
  };
  const onDetailTouchEnd = (e) => {
    if (!swipeRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.sx;
    const dy = t.clientY - swipeRef.current.sy;
    swipeRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = sortedList.findIndex(b => b.id === sel?.id);
    if (idx === -1) return;
    const target = dx < 0 ? sortedList[idx + 1] : sortedList[idx - 1];
    if (target) selectBench(target);
  };

  // Sortierte Bank-Liste fürs Admin-Panel
  const adminSortedBenches = useMemo(() => {
    const arr = [...benches];
    if (adminSort === "user") {
      arr.sort((a, b) => (a.user || "").localeCompare(b.user || "", "de", { sensitivity: "base" }));
    } else if (adminSort === "rating") {
      arr.sort((a, b) => parseFloat(avg(b.ratings)) - parseFloat(avg(a.ratings)) || 0);
    } else if (adminSort === "distance" && userPos) {
      arr.sort((a, b) => dist(userPos.lat, userPos.lng, a.lat, a.lng) - dist(userPos.lat, userPos.lng, b.lat, b.lng));
    } else {
      // date (neueste zuerst)
      arr.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    }
    return arr;
  }, [benches, adminSort, userPos]);

  const inp = { width: "100%", padding: 12, borderRadius: 12, border: `2px solid ${T.brd}`, fontSize: 14, fontFamily: "system-ui", background: "#fff", color: T.txt, outline: "none", boxSizing: "border-box" };
  const bk = { background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontFamily: "system-ui", cursor: "pointer", marginBottom: 14 };

  return (
    <div className="bb-root" style={{ fontFamily: "system-ui, sans-serif", background: T.bg, color: T.txt, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        .bb-root { height: 100vh; height: 100dvh; }
        .pulse { animation: p 2s ease-out infinite; }
        @keyframes p { 0%{transform:scale(.5);opacity:.8} 100%{transform:scale(1.8);opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        input:focus,textarea:focus{border-color:${T.pri} !important}
      `}</style>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg,${T.priDk},${T.pri})`, color: "#fff", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🪑</span>
          <div><div style={{ fontSize: 18, fontWeight: 700 }}>BankBank</div>
            <div style={{ fontSize: 8, opacity: .75, letterSpacing: 1.5, textTransform: "uppercase" }}>Mach mal Pause</div></div>
        </div>
        <button onClick={() => setView("list")} style={{ fontSize: 11, background: "rgba(255,255,255,.15)", padding: "3px 10px", borderRadius: 20, border: "none", color: "#fff", cursor: "pointer" }}>{loading ? "..." : benches.length} Bänke</button>
      </div>

      {/* === ERROR STATE (nur bei Fehler, blockiert Karte) === */}
      {fetchError && view === "map" && (
        <div style={{ flex: 1, background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{ fontSize: 36 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 15, color: "#dc3545", fontWeight: 600, textAlign: "center", padding: "0 32px" }}>{fetchError}</p>
          <button onClick={fetchBenches} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 12, border: "none", background: T.pri, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Erneut versuchen</button>
        </div>
      )}

      {/* === MAP VIEW (sofort sichtbar, auch während Laden) === */}
      {view === "map" && !fetchError && (
        <div ref={mapRef} style={{ flex: 1, position: "relative", overflow: "hidden", touchAction: "none", cursor: "grab", background: "#dce8f1", userSelect: "none" }}
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
              <div key={b.id} data-pin="1" onClick={e => { e.stopPropagation(); selectBench(b); }}
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

          {/* Lade-Anzeige auf der Karte */}
          {loading && (
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 30, background: "#fff", padding: "8px 16px", borderRadius: 20, boxShadow: "0 2px 12px rgba(0,0,0,.15)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, border: `2px solid ${T.brd}`, borderTopColor: T.pri, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13, color: T.mut, fontWeight: 500 }}>Bänke werden geladen...</span>
            </div>
          )}

          {/* Buttons rechts unten */}
          <div data-btn="1" style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 20 }}>
            <button onClick={() => { if (userPos) { setCLat(userPos.lat); setCLng(userPos.lng); setZoom(13); flash("📍 Dein Standort"); } }} style={{ ...btnStyle, background: "#fff", color: userPos ? "#4285F4" : "#aaa" }}>◎</button>
            <button onClick={() => { if (userPos) { setNewPos({ lat: userPos.lat, lng: userPos.lng }); setView("add"); } else { flash("📍 Standort wird ermittelt..."); } }} style={{ ...btnStyle, background: "linear-gradient(135deg,#E8A838,#D4922A)", color: "#fff", fontSize: 22 }}>+</button>
            <button onClick={() => setView("list")} style={{ ...btnStyle, background: "#fff", color: T.pri }}>📋</button>
          </div>

          <div style={{ position: "absolute", bottom: 4, left: 4, fontSize: 8, color: "#666", background: "rgba(255,255,255,.7)", padding: "1px 4px", borderRadius: 3, zIndex: 10 }}>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: "#666" }}>OpenStreetMap</a>, SRTM · © <a href="https://opentopomap.org/" target="_blank" rel="noreferrer" style={{ color: "#666" }}>OpenTopoMap</a> (CC-BY-SA)</div>
        </div>
      )}

      {/* === DETAIL VIEW === */}
      {view === "detail" && sel && (
        <div onTouchStart={onDetailTouchStart} onTouchEnd={onDetailTouchEnd} style={{ flex: 1, overflow: "auto", background: T.bg }}>
          {(() => {
            const idx = sortedList.findIndex(b => b.id === sel.id);
            const total = sortedList.length;
            if (idx === -1 || total <= 1) return null;
            const prev = idx > 0 ? sortedList[idx - 1] : null;
            const next = idx < total - 1 ? sortedList[idx + 1] : null;
            return (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: T.priDk, color: "#fff", borderBottom: `1px solid rgba(255,255,255,.1)` }}>
                <button
                  onClick={() => prev && selectBench(prev)}
                  disabled={!prev}
                  style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: prev ? "pointer" : "default", opacity: prev ? 1 : .35, padding: "6px 14px", borderRadius: 16 }}
                >◀ Vorherige</button>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{idx + 1} / {total}</span>
                <button
                  onClick={() => next && selectBench(next)}
                  disabled={!next}
                  style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: next ? "pointer" : "default", opacity: next ? 1 : .35, padding: "6px 14px", borderRadius: 16 }}
                >Nächste ▶</button>
              </div>
            );
          })()}
          <div style={{ background: `linear-gradient(135deg,${T.priDk},${T.pri})`, color: "#fff", padding: "20px 16px 28px" }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{sel.title}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, opacity: .9 }}>
              <Stars rating={Math.round(parseFloat(avg(sel.ratings)))} size={18} />
              <span style={{ fontSize: 13 }}>{avg(sel.ratings)} · {sel.ratings.length} Bewertungen</span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 11, opacity: .7 }}>📍 von {sel.user} · {sel.date}</p>
          </div>
          {sel.photo && <div style={{ margin: "0 16px", marginTop: -14 }}><img src={sel.photo} alt="" style={{ width: "100%", height: "auto", maxHeight: 420, objectFit: "cover", display: "block", borderRadius: 16 }} /></div>}
          <div style={{ padding: 16 }}>
            <button onClick={() => { setCLat(sel.lat); setCLng(sel.lng); setZoom(17); setView("map"); setSel(null); }} style={{ display: "block", width: "100%", padding: "12px 16px", borderRadius: 12, border: "none", background: T.pri, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>📍 Zeige in der Karte</button>
            <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: `1px solid ${T.brd}`, marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>Beschreibung</h3>
              <p style={{ margin: 0, fontSize: 13, color: T.mut, lineHeight: 1.5 }}>{sel.description}</p>
            </div>
            {/* Bewertung & Kommentar abgeben */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: `1px solid ${T.brd}`, marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Bewertung abgeben</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Dein Name *</label>
                  <input type="text" placeholder="z.B. Anna M." value={revUser} onChange={e => setRevUser(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Bewertung *</label>
                  <Stars rating={revRating} size={28} interactive onRate={setRevRating} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Kommentar *</label>
                  <textarea placeholder="Dein Eindruck von dieser Bank..." value={revText} onChange={e => setRevText(e.target.value)} style={{ ...inp, minHeight: 70, resize: "vertical" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Foto *</label>
                  {revPhoto ? (
                    <div style={{ position: "relative" }}><img src={revPhoto.preview} alt="" style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 12 }} />
                      <button onClick={() => { if (revPhoto?.preview) URL.revokeObjectURL(revPhoto.preview); setRevPhoto(null); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.6)", color: "#fff", border: "none", width: 26, height: 26, borderRadius: "50%", cursor: "pointer" }}>×</button></div>
                  ) : (
                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 80, border: `2px dashed ${T.brd}`, borderRadius: 12, cursor: "pointer", color: T.mut, fontSize: 13, gap: 4 }}>
                      <span style={{ fontSize: 24 }}>📷</span>Foto aufnehmen
                      <input type="file" accept="image/*" capture="environment" onChange={onRevPhoto} style={{ display: "none" }} /></label>
                  )}
                </div>
                <button
                  onClick={addReview}
                  disabled={!revUser.trim() || !revRating || !revText.trim() || !revPhoto || revSubmitting}
                  style={{ padding: 12, borderRadius: 12, border: "none", background: T.pri, color: "#fff", fontSize: 14, fontWeight: 600, cursor: revSubmitting ? "not-allowed" : "pointer", opacity: (!revUser.trim() || !revRating || !revText.trim() || !revPhoto || revSubmitting) ? .5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
                >
                  {revSubmitting && <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />}
                  {revSubmitting ? "Wird gespeichert..." : "Bewertung absenden ✓"}
                </button>
              </div>
            </div>
            {detailLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 16 }}>
                <div style={{ width: 16, height: 16, border: `2px solid ${T.brd}`, borderTopColor: T.pri, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: T.mut }}>Bewertungen laden...</span>
              </div>
            )}
            {!detailLoading && sel.comments.length > 0 && <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Kommentare ({sel.comments.length})</h3>
              {sel.comments.map((c, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 12, border: `1px solid ${T.brd}`, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{c.user}</span><Stars rating={c.rating} size={11} />
                  </div>
                  {c.text && <p style={{ margin: 0, fontSize: 13, color: T.mut }}>{c.text}</p>}
                  {c.photo && <img src={c.photo} alt="" loading="lazy" style={{ width: "100%", height: "auto", maxHeight: 300, objectFit: "cover", borderRadius: 10, marginTop: 6, display: "block" }} />}
                  <span style={{ fontSize: 10, color: T.mut }}>{c.date}</span>
                </div>
              ))}
            </div>}
            {!detailLoading && sel.comments.length === 0 && sel.ratings.length === 0 && (
              <p style={{ fontSize: 13, color: T.mut, textAlign: "center", padding: 8 }}>Noch keine Bewertungen</p>
            )}
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
            <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Dein Name *</label>
              <input type="text" placeholder="z.B. Anna M." value={newUser} onChange={e => setNewUser(e.target.value)} style={inp} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Name der Bank *</label>
              <input type="text" placeholder="z.B. Sonnenbank am See" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inp} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Beschreibung *</label>
              <textarea placeholder="Was macht sie besonders?" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ ...inp, minHeight: 60, resize: "vertical" }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Foto *</label>
              {newPhoto ? (
                <div style={{ position: "relative" }}><img src={newPhoto.preview} alt="" style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 12 }} />
                  <button onClick={() => { if (newPhoto?.preview) URL.revokeObjectURL(newPhoto.preview); setNewPhoto(null); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.6)", color: "#fff", border: "none", width: 26, height: 26, borderRadius: "50%", cursor: "pointer" }}>×</button></div>
              ) : (
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 80, border: `2px dashed ${T.brd}`, borderRadius: 12, cursor: "pointer", color: T.mut, fontSize: 13, gap: 4 }}>
                  <span style={{ fontSize: 24 }}>📷</span>Foto aufnehmen
                  <input type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{ display: "none" }} /></label>
              )}</div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Bewertung *</label>
              <Stars rating={newRating} size={28} interactive onRate={setNewRating} /></div>
            <button onClick={addBench} disabled={!newTitle.trim() || !newUser.trim() || !newPos || !newRating || !newDesc.trim() || !newPhoto || submitting} style={{ padding: 12, borderRadius: 12, border: "none", background: T.pri, color: "#fff", fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: (!newTitle.trim() || !newUser.trim() || !newPos || !newRating || !newDesc.trim() || !newPhoto || submitting) ? .5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>{submitting && <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />}{submitting ? "Wird gespeichert..." : "Eintragen ✓"}</button>
          </div>
        </div>
      )}

      {/* === LIST VIEW === */}
      {view === "list" && (
        <div style={{ flex: 1, overflow: "auto", background: T.bg, position: "relative" }}>
          <div style={{ padding: "12px 16px 6px" }}><input type="text" placeholder="🔍 Bank suchen..." value={search} onChange={e => setSearch(e.target.value)} style={inp} /></div>
          {loading && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 40 }}><div style={{ width: 28, height: 28, border: `3px solid ${T.brd}`, borderTopColor: T.pri, borderRadius: "50%", animation: "spin 1s linear infinite" }} /><p style={{ margin: 0, fontSize: 14, color: T.mut }}>Bänke werden geladen...</p></div>}
          {fetchError && <div style={{ textAlign: "center", padding: 40 }}><p style={{ fontSize: 14, color: "#dc3545", fontWeight: 600 }}>{fetchError}</p><button onClick={fetchBenches} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 12, border: "none", background: T.pri, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Erneut versuchen</button></div>}
          {!loading && !fetchError && filtered.length === 0 && <p style={{ textAlign: "center", color: T.mut, padding: 40 }}>Keine Bänke gefunden 🪑</p>}
          {sortedList.map(b => {
            const d = userPos ? dist(userPos.lat, userPos.lng, b.lat, b.lng) : null;
            return (
              <div key={b.id} onClick={() => { selectBench(b); }} style={{ background: "#fff", borderRadius: 14, margin: "8px 16px", padding: 14, border: `1px solid ${T.brd}`, cursor: "pointer", display: "flex", gap: 12 }}>
                {b.photo && <img src={b.photo} alt="" loading="lazy" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 style={{ margin: "0 0 3px", fontSize: 15 }}>{b.title}</h3>
                    {d !== null && <span style={{ fontSize: 11, color: T.pri, fontWeight: 600, whiteSpace: "nowrap", marginLeft: 8 }}>📍 {fmtDist(d)}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><Stars rating={Math.round(parseFloat(avg(b.ratings)))} size={12} /><span style={{ fontSize: 11, color: T.mut }}>{avg(b.ratings)} · {b.comments.length} Kommentare</span></div>
                  <p style={{ margin: 0, fontSize: 12, color: T.mut }}>{b.description}</p>
                </div>
              </div>
            );
          })}
          {/* Floating Button rechts unten */}
          <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 20 }}>
            <button onClick={() => setView("map")} style={{ ...btnStyle, background: "#fff", color: T.pri }}>🗺️</button>
          </div>
        </div>
      )}

      {/* === ADMIN VIEW === */}
      {view === "admin" && !adminAuth && (
        <div style={{ flex: 1, overflow: "auto", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 340, padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: `1px solid ${T.brd}`, boxShadow: "0 4px 20px rgba(0,0,0,.08)" }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 36 }}>🔒</span>
                <h2 style={{ margin: "8px 0 4px", fontSize: 18, color: T.txt }}>Admin-Login</h2>
                <p style={{ margin: 0, fontSize: 12, color: T.mut }}>Bitte melde dich an</p>
              </div>
              <button onClick={() => { setView("map"); window.history.replaceState(null, "", window.location.pathname); }} style={{ ...bk, background: "rgba(0,0,0,.06)", color: T.mut, marginBottom: 16, width: "100%", textAlign: "center" }}>← Zurück zur Karte</button>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Benutzer</label>
                <input type="email" placeholder="E-Mail-Adresse" value={adminUser} onChange={e => { setAdminUser(e.target.value); setAdminError(""); }} style={inp} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Passwort</label>
                <input type="password" placeholder="Passwort" value={adminPass}
                  onChange={e => { setAdminPass(e.target.value); setAdminError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") { if (adminUser === import.meta.env.VITE_ADMIN_USER && adminPass === import.meta.env.VITE_ADMIN_PASS) { setAdminAuth(true); setAdminError(""); } else { setAdminError("Falsche Zugangsdaten"); } } }}
                  style={inp} />
              </div>
              {adminError && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#dc3545", textAlign: "center" }}>{adminError}</p>}
              <button onClick={() => {
                if (adminUser === import.meta.env.VITE_ADMIN_USER && adminPass === import.meta.env.VITE_ADMIN_PASS) {
                  setAdminAuth(true); setAdminError("");
                } else { setAdminError("Falsche Zugangsdaten"); }
              }} style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", background: T.pri, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Anmelden</button>
            </div>
          </div>
        </div>
      )}

      {view === "admin" && adminAuth && (
        <div style={{ flex: 1, overflow: "auto", background: T.bg }}>
          <div style={{ background: `linear-gradient(135deg,${T.priDk},${T.pri})`, color: "#fff", padding: "16px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>⚙️ Admin-Panel</h2>
              <p style={{ margin: "4px 0 0", fontSize: 11, opacity: .75 }}>{benches.length} Bänke verwalten</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setAdminAuth(false); setAdminUser(""); setAdminPass(""); setView("map"); window.history.replaceState(null, "", window.location.pathname); }}
                style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer" }}>Abmelden</button>
            </div>
          </div>

          {/* E-Mail Report Card */}
          <div style={{ margin: "12px 16px", background: "#fff", borderRadius: 14, padding: 14, border: `1px solid ${T.brd}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14 }}>📧 Tagesbericht</h3>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: T.mut }}>Neue Bänke per E-Mail · täglich 20:00 Uhr</p>
              </div>
              <button
                onClick={async () => {
                  setEmailSending(true);
                  try {
                    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-bench-report`, {
                      method: "POST",
                      headers: {
                        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ test: true }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Unbekannter Fehler");
                    flash(`📧 E-Mail gesendet! (${data.benchesCount || 0} Bänke, ${data.newCommentsCount || 0} Kommentare)`);
                  } catch (e) {
                    flash("❌ Fehler: " + e.message);
                    console.error("E-Mail Fehler:", e);
                  }
                  setEmailSending(false);
                }}
                disabled={emailSending}
                style={{ background: T.pri, border: "none", color: "#fff", padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: emailSending ? .5 : 1, whiteSpace: "nowrap" }}
              >
                {emailSending ? "Sendet..." : "Test senden"}
              </button>
            </div>
          </div>

          {/* Edit-Modal */}
          {editBench && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 400, maxHeight: "80vh", overflow: "auto" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>✏️ Bank bearbeiten</h3>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Name *</label>
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={inp} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.mut, marginBottom: 4, display: "block" }}>Beschreibung</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ ...inp, minHeight: 60, resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setEditBench(null); setEditTitle(""); setEditDesc(""); }} style={{ flex: 1, padding: 10, borderRadius: 12, border: `1px solid ${T.brd}`, background: "#fff", color: T.txt, fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
                  <button onClick={updateBench} disabled={!editTitle.trim()} style={{ flex: 1, padding: 10, borderRadius: 12, border: "none", background: T.pri, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !editTitle.trim() ? .5 : 1 }}>Speichern</button>
                </div>
              </div>
            </div>
          )}

          {/* Admin-Detailansicht (überlagert die Liste, wenn eine Bank gewählt ist) */}
          {adminDetail && (() => {
            const b = adminSortedBenches.find(x => x.id === adminDetail.id) || adminDetail;
            const d = userPos ? dist(userPos.lat, userPos.lng, b.lat, b.lng) : null;
            return (
              <div style={{ margin: "12px 16px", background: "#fff", borderRadius: 16, padding: 16, border: `1px solid ${T.brd}` }}>
                <button onClick={() => setAdminDetail(null)}
                  style={{ background: "rgba(0,0,0,.06)", border: "none", color: T.txt, padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
                  ← Zurück zur Liste
                </button>
                {b.photo && (
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <img
                      src={b.photo}
                      alt=""
                      style={{
                        maxWidth: "100%",
                        maxHeight: 320,
                        width: "auto",
                        height: "auto",
                        borderRadius: 14,
                        background: T.bg,
                      }}
                    />
                  </div>
                )}
                <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>{b.title}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Stars rating={Math.round(parseFloat(avg(b.ratings)))} size={18} />
                  <span style={{ fontSize: 13, color: T.mut }}>Ø {avg(b.ratings)} · {b.ratings.length} Bewertungen</span>
                </div>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: T.mut }}>
                  📍 von {b.user} · {b.date} · {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                  {d !== null && <> · 📏 {fmtDist(d)}</>}
                </p>
                {b.description && (
                  <div style={{ background: T.bg, borderRadius: 10, padding: 12, border: `1px solid ${T.brd}`, marginBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, color: T.txt, lineHeight: 1.5 }}>{b.description}</p>
                  </div>
                )}
                <h3 style={{ margin: "8px 0", fontSize: 14 }}>💬 Kommentare ({b.comments.length})</h3>
                {b.comments.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {b.comments.map(c => (
                      <div key={c.id} style={{ background: T.bg, borderRadius: 10, padding: 10, border: `1px solid ${T.brd}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 12 }}>{c.user}</span>
                          <Stars rating={c.rating} size={11} />
                        </div>
                        {c.text && <p style={{ margin: 0, fontSize: 12, color: T.txt, lineHeight: 1.4 }}>{c.text}</p>}
                        {c.photo && <img src={c.photo} alt="" loading="lazy" style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "cover", borderRadius: 8, marginTop: 6, display: "block" }} />}
                        <span style={{ fontSize: 10, color: T.mut }}>{c.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: T.mut, fontStyle: "italic" }}>Noch keine Textkommentare</p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button onClick={() => { setEditBench(b); setEditTitle(b.title); setEditDesc(b.description || ""); }}
                    style={{ flex: 1, padding: 10, borderRadius: 12, border: `1px solid ${T.brd}`, background: "#fff", color: T.txt, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>✏️ Bearbeiten</button>
                  <button onClick={() => { if (confirm(`"${b.title}" wirklich löschen?`)) { deleteBench(b.id); setAdminDetail(null); } }}
                    style={{ flex: 1, padding: 10, borderRadius: 12, border: "none", background: "#dc3545", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>🗑️ Löschen</button>
                </div>
              </div>
            );
          })()}

          {/* Sortierung */}
          {!adminDetail && (
            <div style={{ margin: "12px 16px", background: "#fff", borderRadius: 14, padding: 12, border: `1px solid ${T.brd}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.mut }}>Sortieren nach:</span>
              <select value={adminSort} onChange={e => setAdminSort(e.target.value)}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: `1px solid ${T.brd}`, fontSize: 13, fontFamily: "system-ui", background: "#fff", color: T.txt, outline: "none", cursor: "pointer" }}>
                <option value="date">📅 Eintragungsdatum (neueste zuerst)</option>
                <option value="user">👤 Nutzername (A–Z)</option>
                <option value="distance" disabled={!userPos}>📏 Entfernung{!userPos ? " (kein Standort)" : ""}</option>
                <option value="rating">⭐ Bewertung (höchste zuerst)</option>
              </select>
            </div>
          )}

          {!adminDetail && benches.length === 0 && <p style={{ textAlign: "center", color: T.mut, padding: 40 }}>Keine Bänke vorhanden</p>}
          {!adminDetail && adminSortedBenches.map(b => (
            <div key={b.id} style={{ background: "#fff", borderRadius: 14, margin: "8px 16px", padding: 14, border: `1px solid ${T.brd}` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {b.photo && <img src={b.photo} alt="" loading="lazy" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: "0 0 3px", fontSize: 15 }}>{b.title}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <Stars rating={Math.round(parseFloat(avg(b.ratings)))} size={11} />
                    <span style={{ fontSize: 10, color: T.mut }}>{avg(b.ratings)}</span>
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.mut }}>{b.user} · {b.date}</p>
                </div>
              </div>
              {b.description && <p style={{ margin: "6px 0 0", fontSize: 12, color: T.mut }}>{b.description}</p>}
              {/* Bewertungen & Kommentare */}
              <div style={{ marginTop: 10, padding: 10, background: T.bg, borderRadius: 10, border: `1px solid ${T.brd}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.txt }}>
                    ⭐ {b.ratings.length} Bewertungen · 💬 {b.comments.length} Kommentare
                  </span>
                  <span style={{ fontSize: 11, color: T.mut }}>Ø {avg(b.ratings)}</span>
                </div>
                {b.comments.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {b.comments.map(c => (
                      <div key={c.id} style={{ background: "#fff", borderRadius: 8, padding: 8, border: `1px solid ${T.brd}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, fontSize: 11 }}>{c.user}</span>
                          <Stars rating={c.rating} size={10} />
                        </div>
                        {c.text && <p style={{ margin: 0, fontSize: 11, color: T.mut, lineHeight: 1.4 }}>{c.text}</p>}
                        {c.photo && <img src={c.photo} alt="" loading="lazy" style={{ width: "100%", height: "auto", maxHeight: 180, objectFit: "cover", borderRadius: 6, marginTop: 4, display: "block" }} />}
                        <span style={{ fontSize: 9, color: T.mut }}>{c.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 11, color: T.mut, fontStyle: "italic" }}>Keine Textkommentare</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setAdminDetail(b)}
                  style={{ flex: 1, padding: 8, borderRadius: 10, border: `1px solid ${T.brd}`, background: T.pri, color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>🔍 Details</button>
                <button onClick={() => { setEditBench(b); setEditTitle(b.title); setEditDesc(b.description || ""); }}
                  style={{ flex: 1, padding: 8, borderRadius: 10, border: `1px solid ${T.brd}`, background: "#fff", color: T.txt, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✏️ Bearbeiten</button>
                <button onClick={() => { if (confirm(`"${b.title}" wirklich löschen?`)) deleteBench(b.id); }}
                  style={{ flex: 1, padding: 8, borderRadius: 10, border: "none", background: "#dc3545", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>🗑️ Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.priDk, color: "#fff", padding: "10px 20px", borderRadius: 30, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,.2)", whiteSpace: "nowrap" }}>{toast}</div>}
    </div>
  );
}
