import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

function createBenchIcon(isSelected, avgRating) {
  const size = isSelected ? 44 : 36
  const ratingBadge = avgRating > 0
    ? `<div style="
        position:absolute; top:-6px; right:-8px;
        width:20px; height:20px; border-radius:50%;
        background:#E8A838; border:2px solid #fff;
        display:flex; align-items:center; justify-content:center;
        font-size:8px; font-weight:700; color:#fff; font-family:system-ui;
      ">${avgRating.toFixed(1)}</div>`
    : ''

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="position:relative;">
      <div style="
        width:${size}px; height:${size}px;
        background:${isSelected ? '#2D5016' : '#4A7C28'};
        border-radius:50% 50% 50% 4px;
        transform:rotate(-45deg);
        border:3px solid #fff;
        box-shadow:0 3px 12px rgba(0,0,0,0.3);
        display:flex; align-items:center; justify-content:center;
        transition:all 0.2s;
      "><span style="transform:rotate(45deg);font-size:${isSelected ? 18 : 14}px;">&#x1FA91;</span></div>
      ${ratingBadge}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [4, size],
  })
}

function AddModeHandler({ addMode, onMapClick }) {
  const map = useMap()

  useEffect(() => {
    map.getContainer().style.cursor = addMode ? 'crosshair' : ''
  }, [addMode, map])

  useMapEvents({
    click(e) {
      if (addMode) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    },
  })

  return null
}

function UserLocation({ position }) {
  const map = useMap()

  if (!position) return null

  return (
    <>
      <Marker
        position={[position.lat, position.lng]}
        icon={L.divIcon({
          className: 'user-location',
          html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="
              width:28px;height:28px;border-radius:50%;
              background:rgba(66,133,244,0.15);
              position:absolute;
              animation:pulse 2s ease-in-out infinite;
            "></div>
            <div style="
              width:14px;height:14px;border-radius:50%;
              background:#4285F4;border:2.5px solid #fff;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
              position:relative;z-index:1;
            "></div>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })}
        interactive={false}
      />
    </>
  )
}

export default function MapView({ benches, onBenchClick, addMode, onMapClick }) {
  const userPositionRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => { userPositionRef.current = { lat: p.coords.latitude, lng: p.coords.longitude } },
      () => { userPositionRef.current = { lat: 50.11, lng: 8.68 } },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }, [])

  const centerOnUser = () => {
    const pos = userPositionRef.current
    if (pos && mapRef.current) {
      mapRef.current.flyTo([pos.lat, pos.lng], 13, { duration: 1 })
    }
  }

  const resetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([51.1657, 10.4515], 6, { duration: 1 })
    }
  }

  return (
    <div className="relative h-full w-full">
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(2); opacity: 0.1; }
        }
      `}</style>

      <MapContainer
        center={[51.1657, 10.4515]}
        zoom={6}
        zoomControl={false}
        className="h-full w-full"
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        {benches.map((bench) => {
          const avg = bench.ratings?.length
            ? bench.ratings.reduce((a, b) => a + b, 0) / bench.ratings.length
            : 0
          return (
            <Marker
              key={bench.id}
              position={[bench.lat, bench.lng]}
              icon={createBenchIcon(false, avg)}
              eventHandlers={{ click: () => onBenchClick(bench) }}
            />
          )
        })}

        <AddModeHandler addMode={addMode} onMapClick={onMapClick} />
      </MapContainer>

      {/* Map controls */}
      <div className="absolute bottom-3 right-3 z-[500] flex flex-col gap-2">
        <button
          onClick={centerOnUser}
          title="Mein Standort"
          className="flex h-11 w-11 items-center justify-center rounded-full border-none bg-white text-xl shadow-md"
          style={{ color: '#4285F4', cursor: 'pointer' }}
        >
          ◎
        </button>
        <button
          onClick={resetView}
          title="Ganz Deutschland"
          className="flex h-11 w-11 items-center justify-center rounded-full border-none bg-white text-base shadow-md"
          style={{ color: '#666', cursor: 'pointer' }}
        >
          🇩🇪
        </button>
      </div>

      {addMode && (
        <div className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-2.5 font-sans text-sm font-semibold text-white shadow-lg">
          📍 Tippe auf die Karte um die Bank zu platzieren
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
