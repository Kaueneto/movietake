import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Film, Tv, Loader2, BookmarkX, Eye, ChevronDown } from 'lucide-react'
import { useWatchlist, type WatchlistItem } from '../hooks/useWatchlist'
import { tmdbImage } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useEffect } from 'react'

export function Watchlist() {
  const navigate = useNavigate()
  const { paraAssistir, assistidos, loading, remover } = useWatchlist()
  const { profileId } = useAuth()

  // poster customizados
  const [customPosters, setCustomPosters] = useState<Record<string, string | null>>({})
  const allItems = [...paraAssistir, ...assistidos]

  useEffect(() => {
    if (!profileId || allItems.length === 0) return
    const ids = allItems.map((i) => i.tmdb_id)
    supabase
      .from('user_media_preferences')
      .select('tmdb_id, media_type, custom_poster_path')
      .eq('user_id', profileId)
      .in('tmdb_id', ids)
      .then(({ data }) => {
        const mapa: Record<string, string | null> = {}
        for (const p of data ?? []) mapa[`${p.media_type}-${p.tmdb_id}`] = p.custom_poster_path
        setCustomPosters(mapa)
      })
  }, [profileId, allItems.length]) // eslint-disable-line

  function posterFor(item: WatchlistItem) {
    const custom = customPosters[`${item.media_type}-${item.tmdb_id}`]
    return tmdbImage(custom ?? item.poster_path, 'w342')
  }

  const total = paraAssistir.length + assistidos.length

  return (
    <div className="min-h-screen bg-[#0f0f13] pb-28">
      {/* Header */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 border-b border-[#2a2a38] bg-[#0f0f13]/95 px-4 backdrop-blur-xl"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: '12px' }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1c1c24] text-[#9898ac] transition-colors hover:text-[#f1f1f3]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-base font-bold text-[#f1f1f3]">Quero assistir</h1>
          {!loading && (
            <p className="text-xs text-[#5a5a72]">
              {total} {total === 1 ? 'título' : 'títulos'}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={26} className="animate-spin text-[#6366f1]" aria-label="Carregando" />
          </div>
        )}

        {/* Vazio */}
        {!loading && total === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <BookmarkX size={40} className="text-[#2a2a38]" aria-hidden="true" />
            <p className="text-sm font-medium text-[#9898ac]">Nenhum título na lista</p>
            <p className="text-xs text-[#5a5a72]">Adicione filmes e séries tocando em "Quero assistir"</p>
            <button
              onClick={() => navigate('/pesquisar')}
              className="mt-2 rounded-xl bg-[#6366f1] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Explorar
            </button>
          </div>
        )}

        {/* para assistir */}
        {!loading && paraAssistir.length > 0 && (
          <SecaoRecolhivel
            label="Para assistir"
            count={paraAssistir.length}
            cor="text-[#6366f1] bg-[#6366f1]/10"
            defaultAberta
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {paraAssistir.map((item) => (
                <PosterCard
                  key={item.id}
                  item={item}
                  poster={posterFor(item)}
                  onRemover={() => remover(item.id)}
                  onClick={() => navigate(item.media_type === 'tv' ? `/series/${item.tmdb_id}` : `/filmes/${item.tmdb_id}`)}
                />
              ))}
            </div>
          </SecaoRecolhivel>
        )}

        {/* assistidos */}
        {!loading && assistidos.length > 0 && (
          <div className={paraAssistir.length > 0 ? 'mt-6' : ''}>
            <SecaoRecolhivel
              label="Já assistidos"
              count={assistidos.length}
              cor="text-green-400 bg-green-500/10"
              defaultAberta={false}
            >
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {assistidos.map((item) => (
                  <PosterCard
                    key={item.id}
                    item={item}
                    poster={posterFor(item)}
                    onRemover={() => remover(item.id)}
                    onClick={() => navigate(item.media_type === 'tv' ? `/series/${item.tmdb_id}` : `/filmes/${item.tmdb_id}`)}
                    dimmed
                  />
                ))}
              </div>
            </SecaoRecolhivel>
          </div>
        )}
      </div>
    </div>
  )
}

function SecaoRecolhivel({ label, count, cor, defaultAberta = true, children }: {
  label: string
  count: number
  cor: string
  defaultAberta?: boolean
  children: React.ReactNode
}) {
  const [aberta, setAberta] = useState(defaultAberta)
  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <button
          onClick={() => setAberta((v) => !v)}
          className="flex items-center gap-1.5"
          aria-expanded={aberta}
        >
          <span className={['inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', cor].join(' ')}>
            {label}
            <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-bold leading-none">{count}</span>
          </span>
          <ChevronDown
            size={14}
            className={['text-[#5a5a72] transition-transform duration-200', aberta ? 'rotate-180' : ''].join(' ')}
            aria-hidden="true"
          />
        </button>
      </div>
      {aberta && <div>{children}</div>}
    </div>
  )
}

function PosterCard({ item, poster, onClick, dimmed }: {
  item: WatchlistItem
  poster: string | null
  onClick: () => void
  onRemover: () => void
  dimmed?: boolean
}) {
  const isTV = item.media_type === 'tv'

  return (
    <div className={['flex flex-col gap-1.5 group', dimmed ? 'opacity-60' : ''].join(' ')}>
      <div className="relative">
        <button
          onClick={onClick}
          className="w-full overflow-hidden rounded-xl border border-[#2a2a38] bg-[#1c1c24] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[#6366f1]/40 group-hover:shadow-lg group-hover:shadow-black/40"
          aria-label={item.title}
        >
          <div className="aspect-[2/3]">
            {poster ? (
              <img
                src={poster}
                alt={item.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                draggable={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#5a5a72]">
                {isTV ? <Tv size={28} /> : <Film size={28} />}
              </div>
            )}
          </div>
        </button>

                  {/* nome que aparecera abaixo do poster */}
        {dimmed && (
          <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-green-500/90 px-1.5 py-0.5 backdrop-blur-sm">
            <Eye size={10} className="text-white" aria-hidden="true" />
            <span className="text-[9px] font-semibold text-white">Visto</span>
          </div>
        )}
      </div>

      <p className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-[#9898ac]">
        {item.title}
        {item.year && <span className="text-[#5a5a72]"> ({item.year})</span>}
      </p>
    </div>
  )
}
