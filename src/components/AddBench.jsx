import { useState, useRef } from 'react'

export default function AddBench({ position, onSubmit, onCancel }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef()

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => setPhotoPreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !position) return
    setSubmitting(true)
    try {
      await onSubmit({ title, description, lat: position.lat, lng: position.lng, photoFile })
    } catch {
      // error handled by parent
    }
    setSubmitting(false)
  }

  return (
    <div className="flex-1 overflow-auto bg-bg">
      {/* Hero */}
      <div className="px-5 pb-8 pt-6 text-white" style={{ background: 'linear-gradient(135deg, #B8860B, #E8A838)' }}>
        <button
          onClick={onCancel}
          className="mb-4 flex items-center gap-1.5 rounded-full border-none bg-white/20 px-4 py-2 font-sans text-[13px] text-white"
        >
          &larr; Abbrechen
        </button>
        <h2 className="m-0 text-2xl">&#x1FA91; Neue Bank eintragen</h2>
        {position && (
          <p className="mt-2 font-sans text-[13px] opacity-80">
            &#x1F4CD; Position: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
          </p>
        )}
      </div>

      <div className="space-y-4 p-5">
        {/* Title */}
        <div>
          <label className="mb-1.5 block font-sans text-[13px] font-semibold text-text-muted">
            Name der Bank *
          </label>
          <input
            type="text"
            placeholder="z.B. Sonnenbank am Elbstrand"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border-2 border-border bg-white p-3 font-sans text-[15px] text-text"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block font-sans text-[13px] font-semibold text-text-muted">
            Beschreibung
          </label>
          <textarea
            placeholder="Was macht diese Bank besonders?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] w-full resize-y rounded-xl border-2 border-border bg-white p-3 font-sans text-[15px] text-text"
          />
        </div>

        {/* Photo */}
        <div>
          <label className="mb-1.5 block font-sans text-[13px] font-semibold text-text-muted">
            Foto
          </label>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Vorschau" className="h-44 w-full rounded-xl object-cover" />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                className="absolute right-2 top-2 flex h-[30px] w-[30px] items-center justify-center rounded-full border-none bg-black/60 text-base text-white"
              >
                &times;
              </button>
            </div>
          ) : (
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border font-sans text-sm text-text-muted transition-colors hover:border-primary">
              <span className="text-[32px]">&#x1F4F7;</span>
              Foto aufnehmen oder auswählen
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhoto}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !position || submitting}
          className="mt-2 w-full rounded-xl border-none bg-primary px-6 py-3 font-sans text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {submitting ? 'Wird eingetragen...' : 'Bank eintragen \u2713'}
        </button>
      </div>
    </div>
  )
}
