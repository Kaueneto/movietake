import { useState, useRef } from 'react'
import { Search, X, Loader2, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { CardMedia } from '../components/pesquisar/CardMedia'
import { CardPessoa } from '../components/pesquisar/CardPessoa'
import { FiltroPesquisa, type FiltroTipo } from '../components/pesquisar/FiltroPesquisa'
import { useDebounce } from '../hooks/useDebounce'
import {
  pesquisar,
  getTrending,
  isPerson,
  getTitle,
  tmdbImage,
  type AnyMediaItem,
  type TMDBMediaItem,
  type TMDBPerson,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useContinuarAssistindo } from '../hooks/useContinuarAssistindo'

// cache de posters — fora do componente, sobrevive a remontagens
const postersCache: Record<string, string | null> = {}
const consultados = new Set<string>()
const posterKey = (mediaType: string, tmdbId: number) => `${mediaType}-${tmdbId}`
const profilePosterKey = (profileId: number, mediaType: string, tmdbId: number) =>
  `${profileId}-${posterKey(mediaType, tmdbId)}`

// persiste o filtro selecionado entre navegações
const FILTRO_KEY = 'pesquisa_filtro'
function getFiltroSalvo(): FiltroTipo {
  try { return (localStorage.getItem(FILTRO_KEY) as FiltroTipo) ?? 'all' } catch { return 'all' }
}
function salvarFiltro(f: FiltroTipo) {
  try { localStorage.setItem(FILTRO_KEY, f) } catch { /* sem localStorage */ }
}

async function buscarPrefs(items: TMDBMediaItem[], profileId: number): Promise<Record<string, string | null>> {
  const novos = items.filter((item) => !consultados.has(profilePosterKey(profileId, item.media_type, item.id)))
  if (novos.length === 0) return {}
  novos.forEach((item) => consultados.add(profilePosterKey(profileId, item.media_type, item.id)))
  try {
    const ids = [...new Set(novos.map((item) => item.id))]
    const { data } = await supabase
      .from('user_media_preferences')
      .select('tmdb_id, media_type, custom_poster_path')
      .eq('user_id', profileId)
      .in('tmdb_id', ids)
    const resultado: Record<string, string | null> = {}
    for (const p of data ?? []) {
      const key = posterKey(p.media_type, p.tmdb_id)
      resultado[key] = p.custom_poster_path
      postersCache[profilePosterKey(profileId, p.media_type, p.tmdb_id)] = p.custom_poster_path
    }
    return resultado
  } catch {
    novos.forEach((item) => consultados.delete(profilePosterKey(profileId, item.media_type, item.id)))
    return {}
  }
}

export function Pesquisa() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  // Inicia com o filtro salvo — não reseta ao navegar
  const [filtro, setFiltro] = useState<FiltroTipo>(getFiltroSalvo)
  // Inicia com o cache já populado — sem flash ao remontar
  const [posters, setPosters] = useState<Record<string, string | null>>({ ...postersCache })
  const { profileId } = useAuth()
  const navigate = useNavigate()
  const { emAndamento } = useContinuarAssistindo()

  const debouncedQuery = useDebounce(query, 350)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery)
    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params)
      if (nextQuery) nextParams.set('q', nextQuery)
      else nextParams.delete('q')
      return nextParams
    }, { replace: true })
  }

  // Persiste o filtro ao mudar
  function handleFiltroChange(f: FiltroTipo) {
    setFiltro(f)
    salvarFiltro(f)
  }

  // aplica posters customizados sem causar flash — atualiza só se houver novidade
  function aplicarPosters(prefs: Record<string, string | null>, prefsProfileId: number) {
    if (Object.keys(prefs).length === 0) return
    setPosters((p) => {
      const preferenciasDoPerfil = Object.fromEntries(
        Object.entries(prefs).map(([key, value]) => [`${prefsProfileId}-${key}`, value]),
      )
      const hasChange = Object.entries(preferenciasDoPerfil).some(([key, value]) => p[key] !== value)
      return hasChange ? { ...p, ...preferenciasDoPerfil } : p
    })
  }

  // trending — cacheado por 5 minutos, não recarrega ao voltar para a página
  const tipo = filtro === 'person' ? 'all' : filtro
  const { data: trendingData } = useQuery({
    queryKey: ['trending', tipo, profileId],
    queryFn: async () => {
      const { data } = await getTrending(tipo, 'week')
      const items = data.results
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 12)
      if (profileId) {
        buscarPrefs(items, profileId).then((prefs) => aplicarPosters(prefs, profileId))
      }
      return items as TMDBMediaItem[]
    },
    staleTime: 5 * 60_000,
  })
  const trending = trendingData ?? []

  // busca — cacheada por 60s, evita re-fetch ao voltar com o mesmo termo
  const { data: searchData, isFetching: searchLoading, error: searchError } = useQuery({
    queryKey: ['search', debouncedQuery, filtro, profileId],
    queryFn: async () => {
      const { data } = await pesquisar(debouncedQuery, filtro)
      // ProteÃ§Ã£o para uma API antiga: buscas filtradas do TMDB nÃ£o trazem media_type.
      const resultados = data.results.map((item) => (
        filtro === 'movie' || filtro === 'tv' ? { ...item, media_type: filtro } : item
      )) as AnyMediaItem[]
      const midias = resultados.filter(
        (r) => r.media_type === 'movie' || r.media_type === 'tv'
      )
      if (profileId && midias.length) {
        buscarPrefs(midias, profileId).then((prefs) => aplicarPosters(prefs, profileId))
      }
      return resultados
    },
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 60_000,
  })

  const results = searchData ?? []
  const loading = searchLoading && debouncedQuery.trim().length > 0

  function customPoster(mediaType: string, tmdbId: number): string | null {
    return profileId ? posters[profilePosterKey(profileId, mediaType, tmdbId)] ?? null : null
  }

  const showTrending = !query.trim() && trending.length > 0
  const showEmpty = !loading && !searchError && query.trim() && results.length === 0
  const mediaItems = results.filter((r): r is TMDBMediaItem => !isPerson(r))
  const peopleItems = results.filter((r): r is TMDBPerson => isPerson(r))
  const destaque = trending[0]
  const progressoPorSerie = new Map(
    emAndamento.map((serie) => [
      serie.tmdbId,
      serie.totalEpisodios > 0 ? serie.episodiosAssistidos / serie.totalEpisodios : 0,
    ]),
  )

  function abrirMidia(item: TMDBMediaItem) {
    navigate(item.media_type === 'movie' ? `/filmes/${item.id}` : `/series/${item.id}`)
  }

  return (
    <PageLayout noPadding>
      <div className="sticky top-0 z-40 space-y-3 bg-[#0f0f13]/90 px-4 pt-5 pb-3 backdrop-blur-2xl">
        <h1 className="text-[32px] font-bold leading-none tracking-[-0.045em] text-[#f7f7fa]">{query.trim() ? 'Pesquisar' : 'Descobrir'}</h1>

        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77778b]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Filmes, séries, pessoas..."
            aria-label="Buscar filmes, séries e pessoas"
            className="w-full rounded-2xl border border-white/[0.07] bg-[#1c1c24]/95 py-3 pl-10 pr-10 text-[15px] text-[#f7f7fa] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] placeholder-[#77778b] outline-none transition focus:border-[#818cf8]/70 focus:ring-4 focus:ring-[#6366f1]/10"
          />
          {query && (
            <button
              onClick={() => { handleQueryChange(''); inputRef.current?.focus() }}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-[#343440] text-[#b7b7c5] transition-colors hover:bg-[#454554] hover:text-white"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <FiltroPesquisa filtro={filtro} onChange={handleFiltroChange} />
      </div>

      <div className="px-4 pt-5 pb-4">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-[#5a5a72]" role="status">
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
            <span className="text-sm">Buscando...</span>
          </div>
        )}

        {searchError && !loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle size={32} className="text-red-400" aria-hidden="true" />
            <p className="text-sm text-[#9898ac]">Não foi possível buscar. Verifique sua conexão.</p>
          </div>
        )}

        {showEmpty && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Search size={32} className="text-[#2a2a38]" aria-hidden="true" />
            <p className="text-sm font-medium text-[#9898ac]">Nenhum resultado para</p>
            <p className="text-sm text-[#5a5a72]">"{query}"</p>
          </div>
        )}

        {!loading && !searchError && results.length > 0 && (
          <section aria-label="Resultados da busca" className="space-y-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#f1f1f3]">Resultados</h2>
              <span className="max-w-[55%] truncate text-xs text-[#77778b]">para “{query}”</span>
            </div>
            {mediaItems.length > 0 && (
              <div>
                {filtro === 'all' && peopleItems.length > 0 && (
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5a5a72]">Filmes &amp; Séries</h2>
                )}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {mediaItems.map((item) => (
                    <CardMedia key={`${item.media_type}-${item.id}`} item={item} mediaType={item.media_type} customPosterPath={customPoster(item.media_type, item.id)} />
                  ))}
                </div>
              </div>
            )}

            {peopleItems.length > 0 && (
              <div>
                {filtro === 'all' && mediaItems.length > 0 && (
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5a5a72]">Pessoas</h2>
                )}
                <div className="flex flex-col gap-2">
                  {peopleItems.map((person) => (
                    <CardPessoa key={`person-${person.id}`} person={person} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {showTrending && !loading && destaque && (
          <>
            <section aria-label={`Destaque: ${getTitle(destaque)}`}>
              <button
                onClick={() => abrirMidia(destaque)}
                className="group relative block h-[300px] w-full overflow-hidden rounded-[28px] bg-[#1c1c24] text-left"
              >
                {tmdbImage(destaque.backdrop_path, 'w780') && (
                  <img
                    src={tmdbImage(destaque.backdrop_path, 'w780')!}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.68),rgba(0,0,0,0.12)_75%),linear-gradient(0deg,rgba(0,0,0,0.82),transparent_65%)]" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/75">
                    <TrendingUp size={15} aria-hidden="true" /> Em alta agora
                  </div>
                  <h2 className="line-clamp-2 text-[28px] font-bold leading-[1.03] tracking-[-0.04em] text-white">{getTitle(destaque)}</h2>
                  {destaque.overview && <p className="mt-2 line-clamp-2 max-w-[92%] text-sm leading-relaxed text-white/75">{destaque.overview}</p>}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white">Ver {destaque.media_type === 'movie' ? 'filme' : 'série'} <ArrowRight size={16} aria-hidden="true" /></span>
                </div>
              </button>
            </section>

            <section aria-label="Em alta esta semana" className="mt-7">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp size={21} className="text-white" strokeWidth={2.5} aria-hidden="true" />
                <h2 className="text-[23px] font-bold tracking-[-0.035em] text-[#f7f7fa]">Em alta esta semana</h2>
              </div>
              <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                {trending.slice(1).map((item) => (
                  <CardMedia
                    key={`${item.media_type}-${item.id}`}
                    item={item}
                    mediaType={item.media_type}
                    customPosterPath={customPoster(item.media_type, item.id)}
                    progress={item.media_type === 'tv' ? progressoPorSerie.get(item.id) : undefined}
                    className="w-[144px] shrink-0 border-transparent bg-transparent hover:border-white/15 hover:bg-[#1c1c24]"
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </PageLayout>
  )
}
