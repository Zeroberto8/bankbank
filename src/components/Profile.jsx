import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user, displayName, signOut } = useAuth()

  if (!user) return null

  return (
    <div className="flex-1 overflow-auto bg-bg">
      <div className="px-5 pb-8 pt-6 text-white" style={{ background: 'linear-gradient(135deg, #2D5016, #4A7C28)' }}>
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl">
          &#x1F464;
        </div>
        <h2 className="m-0 text-2xl">{displayName}</h2>
        <p className="mt-1 font-sans text-sm opacity-80">{user.email}</p>
      </div>

      <div className="p-5">
        <button
          onClick={signOut}
          className="w-full rounded-xl border-2 border-red-400 bg-transparent px-6 py-3 font-sans text-[15px] font-semibold text-red-500"
        >
          Abmelden
        </button>
      </div>
    </div>
  )
}
