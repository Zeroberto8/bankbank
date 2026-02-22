import { useState, useEffect, useRef } from 'react'

// ============================================================
// Germany outline (simplified) for the SVG map
// ============================================================
const GERMANY_OUTLINE = "M 8.1,55 L 8.5,54.5 9,54.8 9.5,54.75 10,54.35 10.4,54.6 11,54.35 11.5,54.5 12,54.4 12.5,54.5 13,54.3 13.5,54.35 14,54.3 14.3,53.9 14.5,53.5 14.7,53 14.6,52.5 14.7,52 14.7,51.5 15,51 14.9,50.9 14.7,51 14.3,50.8 13.9,50.7 13.5,50.4 13,50.5 12.5,50.4 12.2,50.2 12.5,50 12.8,49.8 13,49.5 13.2,49 13,48.8 13.5,48.5 13.8,48.7 13.8,48.2 13,47.5 12.7,47.6 12,47.7 11.5,47.5 11,47.4 10.5,47.5 10,47.3 9.6,47.5 9.5,47.6 9,47.5 8.5,47.6 8,47.5 7.5,47.6 7.5,48 7.5,48.5 7.8,48.5 8,49 7.5,49.5 7,49.5 6.5,49.5 6.3,49.8 6.2,50 6.3,50.3 6.5,50.5 6,50.8 6,51 5.9,51.5 6,51.8 6.2,52 6.7,52 7,52.5 6.7,53 7,53.5 7.2,53.7 8,54 8,54.3 8.3,54.6 8.5,55 Z"

const DEFAULT_VIEWBOX = { minLng: 5.5, maxLng: 15.5, minLat: 47, maxLat: 55.5, width: 10, height: 8.5 }

const CITIES = [
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "München", lat: 48.137, lng: 11.575 },
  { name: "Hamburg", lat: 53.551, lng: 9.994 },
  { name: "Köln", lat: 50.938, lng: 6.96 },
  { name: "Frankfurt", lat: 50.11, lng: 8.68 },
  { name: "Stuttgart", lat: 48.775, lng: 9.183 },
  { name: "Dresden", lat: 51.05, lng: 13.738 },
  { name: "Leipzig", lat: 51.34, lng: 12.373 },
  { name: "Nürnberg", lat: 49.453, lng: 11.077 },
  { name: "Hannover", lat: 52.375, lng: 9.732 },
]

function geoToSvg(lat, lng, vb) {
  const x = ((lng - vb.minLng) / (vb.maxLng - vb.minLng)) * vb.width
  const y = ((vb.maxLat - lat) / (vb.maxLat - vb.minLat)) * vb.height
  return { x, y }
}

function GermanyMap({ benches, onBenchClick, addMode, onMapClick, userPosition, viewBox, setViewBox }) {
  const svgRef = useRef(null)
  const dragRef = useRef(null)

  const handlePointerDown = (e) => {
    if (e.target.closest('[data-pin]')) return
    const svg = svgRef.current
    if (!svg) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, startVB: { ...viewBox }, moved: false }
    svg.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleX = viewBox.width / rect.width
    const scaleY = viewBox.height / rect.height
    setViewBox(vb => ({
      ...vb,
      minLng: dragRef.current.startVB.minLng - dx * scaleX,
      maxLng: dragRef.current.startVB.maxLng - dx * scaleX,
      minLat: dragRef.current.startVB.minLat + dy * scaleY,
      maxLat: dragRef.current.startVB.maxLat + dy * scaleY,
    }))
  }

  const handlePointerUp = (e) => {
    const wasDrag = dragRef.current?.moved
    dragRef.current = null
    if (!wasDrag && addMode && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const lng = viewBox.minLng + (px / rect.width) * (viewBox.maxLng - viewBox.minLng)
      const lat = viewBox.maxLat - (py / rect.height) * (viewBox.maxLat - viewBox.minLat)
      onMapClick?.({ lat, lng })
    }
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 1.15 : 0.87
    setViewBox(vb => {
      const cLng = (vb.minLng + vb.maxLng) / 2
      const cLat = (vb.minLat + vb.maxLat) / 2
      const newW = vb.width * factor
      const newH = vb.height * factor
      if (newW > 20 || newW < 0.5) return vb
      return { minLng: cLng - newW / 2, maxLng: cLng + newW / 2, minLat: cLat - newH / 2, maxLat: cLat + newH / 2, width: newW, height: newH }
    })
  }

  const transformPath = () => {
    return GERMANY_OUTLINE.replace(/(\d+\.?\d*),(\d+\.?\d*)/g, (_, lng, lat) => {
      const p = geoToSvg(parseFloat(lat), parseFloat(lng), viewBox)
      return `${p.x},${p.y}`
    })
  }

  return (
    <svg ref={svgRef} width="100%" height="100%"
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{ touchAction: 'none', cursor: addMode ? 'crosshair' : 'grab', background: '#dce8f1' }}>

      {/* Germany shape */}
      <path d={transformPath()} fill="#e8e4db" stroke="#c5bfb3" strokeWidth="1.5" />

      {/* Grid lines */}
      {Array.from({ length: 20 }, (_, i) => {
        const lng = Math.floor(viewBox.minLng) + i
        const p = geoToSvg(viewBox.maxLat, lng, viewBox)
        return <line key={`vlng${i}`} x1={p.x} y1="0" x2={p.x} y2="100%" stroke="#d0d8df" strokeWidth="0.5" />
      })}
      {Array.from({ length: 20 }, (_, i) => {
        const lat = Math.floor(viewBox.minLat) + i
        const p = geoToSvg(lat, viewBox.minLng, viewBox)
        return <line key={`vlat${i}`} x1="0" y1={p.y} x2="100%" y2={p.y} stroke="#d0d8df" strokeWidth="0.5" />
      })}

      {/* City labels */}
      {CITIES.map(city => {
        const p = geoToSvg(city.lat, city.lng, viewBox)
        return (
          <g key={city.name}>
            <circle cx={p.x} cy={p.y} r="2" fill="#999" />
            <text x={p.x + 6} y={p.y + 3} fontSize="9" fill="#888" fontFamily="system-ui" fontWeight="500">{city.name}</text>
          </g>
        )
      })}

      {/* Bench pins */}
      {benches.map(b => {
        const p = geoToSvg(b.lat, b.lng, viewBox)
        const avg = b.ratings?.length ? b.ratings.reduce((a, c) => a + c, 0) / b.ratings.length : 0
        return (
          <g key={b.id} data-pin="true" onClick={(e) => { e.stopPropagation(); onBenchClick?.(b) }} style={{ cursor: 'pointer' }}>
            <ellipse cx={p.x} cy={p.y + 2} rx="8" ry="3" fill="rgba(0,0,0,0.15)" />
            <circle cx={p.x} cy={p.y - 14} r="14" fill="#4A7C28" stroke="#fff" strokeWidth="2.5" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="12">{'\u{1FA91}'}</text>
            {avg > 0 && (
              <>
                <circle cx={p.x + 11} cy={p.y - 24} r="8" fill="#E8A838" stroke="#fff" strokeWidth="1.5" />
                <text x={p.x + 11} y={p.y - 21} textAnchor="middle" fontSize="7" fill="#fff" fontFamily="system-ui" fontWeight="700">{avg.toFixed(1)}</text>
              </>
            )}
            <polygon points={`${p.x - 4},${p.y - 4} ${p.x + 4},${p.y - 4} ${p.x},${p.y + 2}`} fill="#4A7C28" />
          </g>
        )
      })}

      {/* User position */}
      {userPosition && (() => {
        const p = geoToSvg(userPosition.lat, userPosition.lng, viewBox)
        return (
          <g>
            <circle cx={p.x} cy={p.y} r="18" fill="rgba(66,133,244,0.12)">
              <animate attributeName="r" values="12;22;12" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={p.x} cy={p.y} r="7" fill="#4285F4" stroke="#fff" strokeWidth="2.5" />
          </g>
        )
      })()}

      <text x="4" y="100%" dy="-6" fontSize="8" fill="#999" fontFamily="system-ui">BankBank Karte</text>
    </svg>
  )
}

export default function MapView({ benches, onBenchClick, addMode, onMapClick }) {
  const [userPosition, setUserPosition] = useState(null)
  const [viewBox, setViewBox] = useState({ ...DEFAULT_VIEWBOX })

  useEffect(() => {
    if (!navigator.geolocation) {
      setUserPosition({ lat: 50.11, lng: 8.68 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setUserPosition({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setUserPosition({ lat: 50.11, lng: 8.68 }),
      { enableHighAccuracy: true, timeout: 5000 }
    )
    const id = navigator.geolocation.watchPosition(
      (p) => setUserPosition({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}, { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const centerOnUser = () => {
    if (!userPosition) return
    const w = 2, h = 1.7
    setViewBox({ minLng: userPosition.lng - w / 2, maxLng: userPosition.lng + w / 2, minLat: userPosition.lat - h / 2, maxLat: userPosition.lat + h / 2, width: w, height: h })
  }

  const resetView = () => setViewBox({ ...DEFAULT_VIEWBOX })

  return (
    <div className="relative h-full w-full">
      <GermanyMap
        benches={benches}
        onBenchClick={onBenchClick}
        addMode={addMode}
        onMapClick={onMapClick}
        userPosition={userPosition}
        viewBox={viewBox}
        setViewBox={setViewBox}
      />

      {/* Map controls */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-2">
        <button
          onClick={centerOnUser}
          title="Mein Standort"
          className="flex h-11 w-11 items-center justify-center rounded-full border-none bg-white text-xl shadow-md"
          style={{ color: userPosition ? '#4285F4' : '#aaa', cursor: 'pointer' }}
        >
          {'\u25CE'}
        </button>
        <button
          onClick={resetView}
          title="Ganz Deutschland"
          className="flex h-11 w-11 items-center justify-center rounded-full border-none bg-white text-base shadow-md"
          style={{ color: '#666', cursor: 'pointer' }}
        >
          {'\uD83C\uDDE9\uD83C\uDDEA'}
        </button>
      </div>

      {addMode && (
        <div
          className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-2.5 font-sans text-sm font-semibold text-white shadow-lg"
        >
          {'\uD83D\uDCCD'} Tippe auf die Karte um die Bank zu platzieren
          <button
            onClick={(e) => { e.stopPropagation(); onMapClick(null) }}
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-full border-none bg-black/20 text-sm text-white"
            style={{ cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  )
}
