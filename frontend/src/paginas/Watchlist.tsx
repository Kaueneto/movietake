import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Film, Tv, Loader2, BookmarkX } from 'lucide-react'
import { useWatchlist } from '../hooks/useWatchlist'
import { tmdbImage } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useEffect, useState } from 'react'

export function Watchlist() {
  const navigate = useNavigate()
  const { items, loading, remover } = useWatchlist()
  const { profileId } = useAuth()

  // mapa de posters customizados: "mediaType-tmdbId" → path
  const [customPosters, setCustomPosters] = useState<Record<string, string | null>>({})

  // carrega posters personalizados de todos os itens da watchlist
  useEffect(() => {
    if (!profileId || items.length === 0) return
    const ids = items.map((i) => i.tmdb_id)
    supabase
      .from('user_media_preferences')
      .select('tmdb_id, media_type, custom_poster_path')
      .eq('user_id', profileId)
      .in('tmdb_id', ids)
      .then(({ data }) => {
        const mapa: Record<string, string | null> = {}
        for (const p of data ?? []) {
          mapa[`${p.media_type}-${p.tmdb_id}`] = p.custom_poster_path
        }
        setCustomPosters(mapa)
      })
  }, [profileId, items.length])

  function posterFor(item: { tmdb_id: number; media_type: string; poster_path: string | null }) {
    const custom = customPosters[`${item.media_type}-${item.tmdb_id}`]
    return tmdbImage(custom ?? item.poster_path, 'w342')
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-[#2a2a38] bg-[#0f0f13]/95 px-4 backdrop-blur-xl"
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
              {items.length} {items.length === 1 ? 'título' : 'títulos'}
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
        {!loading && items.length === 0 && (
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

        {/* grid de posters */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-4">
            {items.map((item) => {
              const poster = posterFor(item)
              const isTV = item.media_type === 'tv'
              return (
                <div key={item.id} className="flex flex-col gap-1.5 group">
                  {/* poster clicável */}
                  <button
                    onClick={() => navigate(isTV ? `/series/${item.tmdb_id}` : `/filmes/${item.tmdb_id}`)}
                  className="relative w-full overflow-hidden rounded-md border border-white/[0.1] bg-[#1c1c24] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-indigo-400/30 group-hover:shadow-lg group-hover:shadow-black/40"   
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
                  <p className="line-clamp-2 text-center text-[12px] font-medium leading-tight text-white/60 font-segoe">
                    {item.title}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
