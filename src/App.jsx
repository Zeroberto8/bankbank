import { useState, useCallback } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useBenches } from './hooks/useBenches'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import MapView from './components/MapView'
import BenchDetail from './components/BenchDetail'
import AddBench from './components/AddBench'
import ListView from './components/ListView'
import NearbyView from './components/NearbyView'
import Auth from './components/Auth'
import Profile from './components/Profile'
import Toast from './components/Toast'

function AppContent() {
  const { user } = useAuth()
  const { benches, loading, addBench, addReview } = useBenches()

  const [view, setView] = useState('map')
  const [selectedBench, setSelectedBench] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const [newBenchPos, setNewBenchPos] = useState(null)
  const [toast, setToast] = useState(null)
  const [flyTo, setFlyTo] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleBenchClick = useCallback((bench) => {
    setSelectedBench(bench)
    setView('detail')
  }, [])

  const handleMapClick = useCallback((pos) => {
    if (!pos) {
      setAddMode(false)
      return
    }
    setNewBenchPos(pos)
    setAddMode(false)
    setView('addForm')
  }, [])

  const handleNavigate = (target) => {
    if (target === 'add') {
      if (!user) {
        showToast('Bitte melde dich an, um eine Bank hinzuzufügen.')
        setView('profile')
        return
      }
      setAddMode(true)
      setView('map')
      return
    }
    if (target === 'profile') {
      setView(user ? 'profile' : 'auth')
      return
    }
    setAddMode(false)
    setView(target)
  }

  const handleAddBench = async ({ title, description, lat, lng, photoFile }) => {
    if (!user) return
    try {
      await addBench({ title, description, lat, lng, photoFile, userId: user.id })
      setView('map')
      setNewBenchPos(null)
      showToast('\uD83E\uDE91 Bank erfolgreich hinzugefügt!')
    } catch (err) {
      showToast('Fehler: ' + err.message)
    }
  }

  const handleAddReview = async ({ benchId, userId, rating, comment }) => {
    try {
      await addReview({ benchId, userId, rating, comment })
      const updated = benches.find((b) => b.id === benchId)
      if (updated) setSelectedBench(updated)
      showToast('Bewertung gespeichert! \u2B50')
    } catch (err) {
      showToast('Fehler: ' + err.message)
    }
  }

  const handleBenchClickFromList = (bench) => {
    setSelectedBench(bench)
    setView('detail')
  }

  const activeNavView = ['map', 'addForm'].includes(view)
    ? 'map'
    : ['auth', 'profile'].includes(view)
      ? 'profile'
      : view === 'detail'
        ? 'map'
        : view

  return (
    <div className="flex h-full w-full flex-col overflow-hidden font-serif">
      <Header benchCount={benches.length} />

      {/* Main content */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {view === 'detail' ? (
          <BenchDetail
            bench={selectedBench}
            onBack={() => { setView('map'); setSelectedBench(null) }}
            onAddReview={handleAddReview}
          />
        ) : view === 'addForm' ? (
          <AddBench
            position={newBenchPos}
            onSubmit={handleAddBench}
            onCancel={() => { setView('map'); setNewBenchPos(null) }}
          />
        ) : view === 'list' ? (
          <ListView benches={benches} onBenchClick={handleBenchClickFromList} />
        ) : view === 'nearby' ? (
          <NearbyView benches={benches} onBenchClick={handleBenchClickFromList} />
        ) : view === 'auth' ? (
          <Auth onClose={() => setView('map')} />
        ) : view === 'profile' ? (
          user ? <Profile /> : <Auth onClose={() => setView('map')} />
        ) : (
          /* Map view (default) */
          <div className="relative flex-1">
            {loading ? (
              <div className="flex h-full items-center justify-center font-sans text-text-muted">
                Bänke werden geladen...
              </div>
            ) : (
              <MapView
                benches={benches}
                onBenchClick={handleBenchClick}
                selectedBench={selectedBench}
                addMode={addMode}
                onMapClick={handleMapClick}
                flyTo={flyTo}
              />
            )}

            {!addMode && (
              <button
                onClick={() => {
                  if (!user) {
                    showToast('Bitte melde dich an, um eine Bank hinzuzufügen.')
                    setView('profile')
                    return
                  }
                  setAddMode(true)
                }}
                className="absolute bottom-20 right-5 z-[500] flex h-14 w-14 items-center justify-center rounded-full border-none text-[28px] text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #E8A838, #D4922A)' }}
                title="Neue Bank hinzufügen"
              >
                +
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav view={activeNavView} onNavigate={handleNavigate} />
      <Toast message={toast} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
