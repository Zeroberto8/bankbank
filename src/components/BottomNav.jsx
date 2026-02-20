const navItems = [
  { id: 'map', icon: '\uD83D\uDDFA\uFE0F', label: 'Karte' },
  { id: 'list', icon: '\uD83D\uDCCB', label: 'Liste' },
  { id: 'add', icon: '\u2795', label: 'Hinzufügen', highlight: true },
  { id: 'nearby', icon: '\uD83D\uDCCD', label: 'In der Nähe' },
  { id: 'profile', icon: '\uD83D\uDC64', label: 'Profil' },
]

export default function BottomNav({ view, onNavigate }) {
  return (
    <nav className="z-50 flex border-t border-border bg-white pb-2.5 pt-1.5">
      {navItems.map((item) => {
        const isActive = view === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 border-none bg-none py-1.5 font-sans text-[10px] transition-colors ${
              isActive ? 'font-bold text-primary' : 'font-medium text-text-muted'
            }`}
          >
            <span
              className={`text-[22px] ${
                item.highlight
                  ? 'flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white'
                  : ''
              }`}
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
