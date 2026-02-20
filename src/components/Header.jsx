export default function Header({ benchCount }) {
  return (
    <header className="z-50 flex items-center justify-between px-5 py-3.5 text-white shadow-lg"
      style={{ background: 'linear-gradient(135deg, #2D5016 0%, #4A7C28 100%)' }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[26px]">&#x1FA91;</span>
        <div>
          <div className="font-display text-[22px] font-bold tracking-tight">BankBank</div>
          <div className="font-sans text-[10px] uppercase tracking-[1.5px] opacity-80">
            Deutschlands schönste Bänke
          </div>
        </div>
      </div>
      <div className="rounded-full bg-white/15 px-3 py-1 font-sans text-[13px]">
        {benchCount} Bänke
      </div>
    </header>
  )
}
