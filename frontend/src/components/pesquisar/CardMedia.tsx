import { Star, Tv, Film, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { tmdbImage, getTitle, getReleaseYear } from '../../lib/api'
import type { TMDBMovie, TMDBSerie } from '../../lib/api'

interface Props {
  item: TMDBMovie | TMDBSerie
  mediaType: 'movie' | 'tv'
}

export function CardMedia({ item, mediaType }: Props) {
  const navigate = useNavigate()
  const title = getTitle(item)
  const year = getReleaseYear(item)
  const poster = tmdbImage(item.poster_path, 'w342')
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null
  const isTV = mediaType === 'tv'

  function handleClick() {
    if (mediaType === 'movie') navigate(`/filmes/${item.id}`)
    else navigate(`/series/${item.id}`)
  }

  return (
    <article
      onClick={handleClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#2a2a38] bg-[#1c1c24] transition-all duration-200 hover:-translate-y-1 hover:border-[#6366f1]/40 hover:shadow-xl hover:shadow-black/40 cursor-pointer"
      aria-label={title}
    >
      {/* parte do poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-[#16161c]">
        {poster ? (
          <img
            src={poster}
            alt={`Poster de ${title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-[#5a5a72]"
            aria-hidden="true"
          >
            {isTV ? <Tv size={40} /> : <Film size={40} />}
          </div>
        )}

        {/* badge */}
        <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full border border-[#2a2a38] bg-[#0f0f13]/80 px-1.5 py-0.5 text-[10px] font-medium text-[#9898ac] backdrop-blur-sm">
          {isTV ? <Tv size={9} aria-hidden="true" /> : <Film size={9} aria-hidden="true" />}
          {isTV ? 'Série' : 'Filme'}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-2">
        <h3
          className="line-clamp-2 text-xs font-semibold leading-snug text-[#f1f1f3]"
          title={title}
        >
          {title}
        </h3>

        <div className="flex items-center gap-2">
          {year && (
            <span className="flex items-center gap-0.5 text-[10px] text-[#5a5a72]">
              <Calendar size={10} aria-hidden="true" />
              {year}
            </span>
          )}
          {rating && (
            <span
              className="flex items-center gap-0.5 text-[10px] text-[#5a5a72]"
              aria-label={`Nota ${rating}`}
            >
              <Star size={10} className="text-[#6366f1]" aria-hidden="true" />
              {rating}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
