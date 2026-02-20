import { useState } from 'react'
import Stars, { avgRating } from './Stars'
import { useAuth } from '../contexts/AuthContext'

export default function BenchDetail({ bench, onBack, onAddReview }) {
  const { user, displayName } = useAuth()
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  if (!bench) return null

  const avg = avgRating(bench.ratings)

  const handleSubmit = async () => {
    if (!comment.trim() || !rating || !user) return
    setSubmitting(true)
    try {
      await onAddReview({ benchId: bench.id, userId: user.id, rating, comment })
      setComment('')
      setRating(0)
    } catch {
      // error handled by parent
    }
    setSubmitting(false)
  }

  return (
    <div className="flex-1 overflow-auto bg-bg">
      {/* Hero */}
      <div className="px-5 pb-8 pt-6 text-white" style={{ background: 'linear-gradient(135deg, #2D5016, #4A7C28)' }}>
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 rounded-full border-none bg-white/20 px-4 py-2 font-sans text-[13px] text-white"
        >
          &larr; Zurück zur Karte
        </button>
        <h2 className="m-0 text-2xl leading-tight">{bench.title}</h2>
        <div className="mt-2.5 flex items-center gap-2.5 opacity-90">
          <Stars rating={Math.round(parseFloat(avg))} size={18} />
          <span className="font-sans text-sm">{avg} &middot; {bench.ratings.length} Bewertungen</span>
        </div>
        <p className="mt-2 font-sans text-xs opacity-70">
          &#x1F4CD; {bench.lat.toFixed(4)}, {bench.lng.toFixed(4)}
        </p>
      </div>

      {/* Photo */}
      {bench.photo_url && (
        <div className="mx-4 -mt-4">
          <img
            src={bench.photo_url}
            alt={bench.title}
            className="h-48 w-full rounded-2xl object-cover shadow-lg"
          />
        </div>
      )}

      <div className="space-y-4 p-4">
        {/* Description */}
        <div className="rounded-2xl border border-border bg-white p-5">
          <h3 className="m-0 mb-2 text-base">Beschreibung</h3>
          <p className="m-0 font-sans text-sm leading-relaxed text-text-muted">
            {bench.description || 'Keine Beschreibung vorhanden.'}
          </p>
        </div>

        {/* Add Review */}
        <div className="rounded-2xl border border-border bg-white p-5">
          <h3 className="m-0 mb-4 text-base">Bewertung abgeben</h3>
          {user ? (
            <>
              <div className="mb-3">
                <Stars rating={rating} size={28} interactive onRate={setRating} />
              </div>
              <textarea
                placeholder="Dein Kommentar..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px] w-full resize-y rounded-xl border-2 border-border bg-white p-3 font-sans text-[15px] text-text"
              />
              <button
                onClick={handleSubmit}
                disabled={!comment.trim() || !rating || submitting}
                className="mt-3 w-full rounded-xl border-none bg-primary px-6 py-3 font-sans text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Wird gespeichert...' : 'Bewertung absenden'}
              </button>
            </>
          ) : (
            <p className="font-sans text-sm text-text-muted">
              Bitte melde dich an, um eine Bewertung abzugeben.
            </p>
          )}
        </div>

        {/* Comments */}
        {bench.comments.length > 0 && (
          <div>
            <h3 className="mb-3 ml-1 text-base">Kommentare ({bench.comments.length})</h3>
            <div className="space-y-2.5">
              {bench.comments.map((c) => (
                <div key={c.id} className="rounded-[14px] border border-border bg-white px-4 py-3.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-sans text-sm font-bold">{c.user?.slice(0, 8) || 'Anonym'}</span>
                    <Stars rating={c.rating} size={12} />
                  </div>
                  <p className="m-0 font-sans text-sm leading-relaxed text-text-muted">{c.text}</p>
                  <span className="mt-1.5 block font-sans text-[11px] text-text-muted">{c.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
