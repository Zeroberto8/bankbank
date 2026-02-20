import { useState, useEffect } from 'react'
import Stars, { avgRating } from './Stars'

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function NearbyView({ benches, onBenchClick }) {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Dein Browser unterstützt keine Standortabfrage.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      () => {
        setError('Standort konnte nicht ermittelt werden. Bitte erlaube den Zugriff in deinen Browser-Einstellungen.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const sorted = location
    ? benches
        .map((b) => ({ ...b, distance: getDistance(location.lat, location.lng, b.lat, b.lng) }))
        .sort((a, b) => a.distance - b.distance)
    : []

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg font-sans text-text-muted">
        <div className="text-center">
          <div className="mb-3 text-4xl">&#x1F4CD;</div>
          <p>Standort wird ermittelt...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg p-8 font-sans text-text-muted">
        <div className="text-center">
          <div className="mb-3 text-4xl">&#x1F6AB;</div>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-bg">
      <div className="px-4 pb-2 pt-4">
        <h2 className="m-0 text-lg">Bänke in deiner Nähe</h2>
        <p className="mt-1 font-sans text-xs text-text-muted">
          Sortiert nach Entfernung von deinem Standort
        </p>
      </div>

      <div className="space-y-0 px-0 pb-20 pt-1">
        {sorted.length === 0 && (
          <p className="p-10 text-center font-sans text-sm text-text-muted">
            Noch keine Bänke eingetragen &#x1FA91;
          </p>
        )}
        {sorted.map((b) => {
          const avg = avgRating(b.ratings)
          const distStr =
            b.distance < 1
              ? `${Math.round(b.distance * 1000)} m`
              : `${b.distance.toFixed(1)} km`

          return (
            <div
              key={b.id}
              onClick={() => onBenchClick(b)}
              className="mx-4 mb-3 cursor-pointer rounded-2xl border border-border bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="m-0 mb-1 text-base">{b.title}</h3>
                  <div className="mb-1.5 flex items-center gap-2">
                    <Stars rating={Math.round(parseFloat(avg))} size={13} />
                    <span className="font-sans text-xs text-text-muted">
                      {avg} &middot; {distStr} entfernt
                    </span>
                  </div>
                  <p className="m-0 line-clamp-2 font-sans text-[13px] leading-snug text-text-muted">
                    {b.description}
                  </p>
                </div>
                <div className="ml-3 flex flex-col items-center rounded-xl bg-primary/10 px-3 py-2">
                  <span className="font-sans text-sm font-bold text-primary">{distStr}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
