export default function Toast({ message }) {
  if (!message) return null

  return (
    <div
      className="fixed bottom-20 left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-primary-dark px-6 py-3 font-sans text-sm font-semibold text-white shadow-lg"
      style={{ animation: 'slideUp 0.3s ease-out' }}
    >
      {message}
    </div>
  )
}
