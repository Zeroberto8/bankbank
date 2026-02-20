import { useState } from 'react'

export default function Stars({ rating, size = 16, interactive = false, onRate }) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className="transition-all duration-150"
          style={{
            fontSize: size,
            cursor: interactive ? 'pointer' : 'default',
            color: star <= (hover || rating) ? '#E8A838' : '#D1C7B7',
            transform: interactive && star <= hover ? 'scale(1.2)' : 'scale(1)',
          }}
        >
          &#9733;
        </span>
      ))}
    </div>
  )
}

export function avgRating(ratings) {
  if (!ratings || ratings.length === 0) return '\u2013'
  return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
}
