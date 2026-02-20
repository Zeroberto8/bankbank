import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Auth({ onClose }) {
  const { signIn, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
        onClose?.()
      } else {
        await signUp(email, password, displayName || email.split('@')[0])
        setSuccess('Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse.')
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex-1 overflow-auto bg-bg">
      <div className="px-5 pb-8 pt-6 text-white" style={{ background: 'linear-gradient(135deg, #2D5016, #4A7C28)' }}>
        <h2 className="m-0 text-2xl">&#x1F464; {isLogin ? 'Anmelden' : 'Registrieren'}</h2>
        <p className="mt-2 font-sans text-sm opacity-80">
          {isLogin ? 'Melde dich an um Bänke zu bewerten und hinzuzufügen.' : 'Erstelle ein Konto um loszulegen.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {!isLogin && (
          <div>
            <label className="mb-1.5 block font-sans text-[13px] font-semibold text-text-muted">
              Anzeigename
            </label>
            <input
              type="text"
              placeholder="Dein Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-white p-3 font-sans text-[15px] text-text"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block font-sans text-[13px] font-semibold text-text-muted">
            E-Mail *
          </label>
          <input
            type="email"
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border-2 border-border bg-white p-3 font-sans text-[15px] text-text"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-sans text-[13px] font-semibold text-text-muted">
            Passwort *
          </label>
          <input
            type="password"
            placeholder="Mindestens 6 Zeichen"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border-2 border-border bg-white p-3 font-sans text-[15px] text-text"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-3 font-sans text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-green-50 p-3 font-sans text-sm text-green-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border-none bg-primary px-6 py-3 font-sans text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {loading ? 'Bitte warten...' : isLogin ? 'Anmelden' : 'Registrieren'}
        </button>

        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess('') }}
          className="w-full rounded-xl border-2 border-primary bg-transparent px-6 py-3 font-sans text-[15px] font-semibold text-primary"
        >
          {isLogin ? 'Noch kein Konto? Registrieren' : 'Bereits ein Konto? Anmelden'}
        </button>
      </form>
    </div>
  )
}
