import { useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

function createBenchIcon(isSelected) {
  const size = isSelected ? 44 : 36
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${isSelected ? '#2D5016' : '#4A7C28'};
      border-radius: 50% 50% 50% 4px;
      transform: rotate(-45deg);
      border: 3px solid #fff;
      box-shadow: 0 3px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    "><span style="
      transform: rotate(45deg);
      font-size: ${isSelected ? 18 : 14}px;
    ">&#x1FA91;</span></div>`,
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

function FlyToLocation({ center }) {
  const map = useMap()
  const prevCenter = useRef(null)

  useEffect(() => {
    if (center && center !== prevCenter.current) {
      map.flyTo([center.lat, center.lng], 14, { duration: 1 })
      prevCenter.current = center
    }
  }, [center, map])

  return null
}

export default function MapView({ benches, onBenchClick, selectedBench, addMode, onMapClick, flyTo }) {
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[51.1657, 10.4515]}
        zoom={6}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        {benches.map((bench) => (
          <Marker
            key={bench.id}
            position={[bench.lat, bench.lng]}
            icon={createBenchIcon(selectedBench?.id === bench.id)}
            eventHandlers={{ click: () => onBenchClick(bench) }}
          />
        ))}

        <AddModeHandler addMode={addMode} onMapClick={onMapClick} />
        <FlyToLocation center={flyTo} />

        <div className="leaflet-bottom leaflet-right">
          <div className="leaflet-control leaflet-bar">
          </div>
        </div>
      </MapContainer>

      {addMode && (
        <div
          className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-sans text-sm font-semibold text-white shadow-lg"
        >
          <span>&#x1F4CD;</span> Tippe auf die Karte um die Bank zu platzieren
          <button
            onClick={(e) => { e.stopPropagation(); onMapClick(null) }}
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-full border-none bg-black/20 text-sm text-white"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  )
}
