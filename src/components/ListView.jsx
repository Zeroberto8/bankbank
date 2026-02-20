import { useState } from 'react'
import Stars, { avgRating } from './Stars'

export default function ListView({ benches, onBenchClick }) {
  const [search, setSearch] = useState('')

  const filtered = benches
    .filter(
      (b) =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        (b.description || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const avgA = parseFloat(avgRating(a.ratings)) || 0
      const avgB = parseFloat(avgRating(b.ratings)) || 0
      return avgB - avgA
    })

  return (
    <div className="flex-1 overflow-auto bg-bg">
      {/* Search */}
      <div className="px-4 pb-2 pt-4">
        <input
          type="text"
          placeholder="&#x1F50D; Bank suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border-2 border-border bg-white p-3 font-sans text-[15px] text-text"
        />
      </div>

      {/* List */}
      <div className="space-y-0 px-0 pb-20 pt-1">
        {filtered.length === 0 && (
          <p className="p-10 text-center font-sans text-sm text-text-muted">
            Keine Bänke gefunden &#x1FA91;
          </p>
        )}
        {filtered.map((b) => {
          const avg = avgRating(b.ratings)
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
                      {avg} &middot; {b.comments.length} Kommentare
                    </span>
                  </div>
                  <p className="m-0 line-clamp-2 font-sans text-[13px] leading-snug text-text-muted">
                    {b.description}
                  </p>
                </div>
                {b.photo_url && (
                  <img
                    src={b.photo_url}
                    alt=""
                    className="ml-3 h-16 w-16 rounded-[10px] object-cover"
                  />
                )}
              </div>
              <div className="mt-2 font-sans text-[11px] text-text-muted">
                {new Date(b.created_at).toLocaleDateString('de-DE')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
