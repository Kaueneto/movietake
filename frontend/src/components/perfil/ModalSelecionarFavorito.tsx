import { useEffect, useRef, useState } from 'react'
import { Search, X, Loader2, Film, Tv, Check } from 'lucide-react'
import { pesquisar, tmdbImage, isPerson, type AnyMediaItem, type TMDBMediaItem } from '../../lib/api'
import { useDebounce } from '../../hooks/useDebounce'

interface Props {
  position: number
  onSelecionar: (tmdb_id: number, media_type: 'movie' | 'tv') => void
  onFechar: () => void
}

export function ModalSelecionarFavorito({ position, onSelecionar, onFechar }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBMediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selecionado, setSelecionado] = useState<TMDBMediaItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 350)

  // block scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // bsuca ao digitar
  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return }
    let cancelled = false
    setLoading(true)
    pesquisar(debouncedQuery, 'all')
      .then(({ data }) => {
        if (cancelled) return
        setResults(
          data.results
            .filter((r): r is TMDBMediaItem =>
              !isPerson(r as AnyMediaItem) &&
              (r.media_type === 'movie' || r.media_type === 'tv')
            )
            .slice(0, 12)
        )
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedQuery])

  function confirmar() {
    if (!selecionado) return
    onSelecionar(selecionado.id, selecionado.media_type)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0f0f13]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Selecionar favorito ${position}`}
    >

      <div className="flex items-center gap-3 border-b border-[#2a2a38] px-4 py-3">
        <button
          onClick={onFechar}
          aria-label="Fechar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1c1c24] text-[#9898ac] transition-colors hover:text-[#f1f1f3]"
        >
          <X size={17} aria-hidden="true" />
        </button>
        <h2 className="flex-1 text-sm font-semibold text-[#f1f1f3]">Favorito {position}</h2>
        <button
          onClick={confirmar}
          disabled={!selecionado}
          className={[
            'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
            selecionado
              ? 'bg-[#6366f1] text-white hover:bg-[#7577f3]'
              : 'cursor-not-allowed text-[#5a5a72]',
          ].join(' ')}
        >
          Salvar
        </button>
      </div>

     <div className="px-4 py-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a5a72]" aria-hidden="true" />
          <input
            ref={inputRef}
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar filme ou série..."
            className="w-full rounded-xl border border-[#2a2a38] bg-[#1c1c24] py-3 pl-10 pr-4 text-base text-[#f1f1f3] placeholder-[#5a5a72] outline-none transition-colors focus:border-[#6366f1]"
          />
        </div>
      </div>

     <div className="flex-1 overflow-y-auto px-4" style={{ scrollbarWidth: 'none' }}>
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 size={22} className="animate-spin text-[#6366f1]" />
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-3 gap-3 pb-4">
            {results.map((item) => {
              const poster = tmdbImage(item.poster_path, 'w185')
              const isSelected = selecionado?.id === item.id
              const title = item.media_type === 'movie' ? (item as any).title : (item as any).name
              return (
                <button
                  key={`${item.media_type}-${item.id}`}
                  onClick={() => setSelecionado(isSelected ? null : item)}
                  aria-pressed={isSelected}
                  className="flex flex-col gap-1.5 text-left"
                >
                  <div className={[
                    'relative aspect-[2/3] overflow-hidden rounded-xl transition-all duration-150',
                    isSelected ? 'ring-2 ring-[#6366f1]' : '',
                  ].join(' ')}>
                    {poster ? (
                      <img src={poster} alt={title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#1c1c24] text-[#5a5a72]">
                        {item.media_type === 'tv' ? <Tv size={24} /> : <Film size={24} />}
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#6366f1]">
                        <Check size={12} className="text-white" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <p className="line-clamp-2 text-[10px] font-medium leading-tight text-[#9898ac]">{title}</p>
                </button>
              )
            })}
          </div>
        )}

        {!loading && results.length === 0 && query.trim() && (
          <p className="py-10 text-center text-sm text-[#5a5a72]">Nenhum resultado encontrado.</p>
        )}

        {!query.trim() && (
          <p className="py-10 text-center text-sm text-[#5a5a72]">Digite para pesquisar um filme ou série.</p>
        )}
      </div>

    </div>
  )
}
