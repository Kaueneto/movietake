import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, TrendingUp, AlertCircle } from 'lucide-react'
import { PageLayout } from '../components/layout/PageLayout'
import { CardMedia } from '../components/pesquisar/CardMedia'
import { CardPessoa } from '../components/pesquisar/CardPessoa'
import { FiltroPesquisa, type FiltroTipo } from '../components/pesquisar/FiltroPesquisa'
import { useDebounce } from '../hooks/useDebounce'
import {
  pesquisar,
  getTrending,
  isPerson,
  type AnyMediaItem,
  type TMDBMediaItem,
  type TMDBPerson,
} from '../lib/api'

export function Pesquisa() {
  const [query, setQuery] = useState('')
  const [filtro, setFiltro] = useState<FiltroTipo>('all')
  const [results, setResults] = useState<AnyMediaItem[]>([])
  const [trending, setTrending] = useState<TMDBMediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalResults, setTotalResults] = useState(0)

  const debouncedQuery = useDebounce(query, 400)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getTrending('all', 'week')
      .then(({ data }) => {
        setTrending(
          data.results
            .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
            .slice(0, 12),
        )
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setError(null)
      setTotalResults(0)
      return
    }

    let cancelled = false

    async function buscar() {
      setLoading(true)
      setError(null)
      try {
        const { data } = await pesquisar(debouncedQuery, filtro)
        if (cancelled) return
        setResults(data.results)
        setTotalResults(data.total_results)
      } catch {
        if (!cancelled) setError('Não foi possível buscar. Verifique se o backend está rodando.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    buscar()
    return () => { cancelled = true }
  }, [debouncedQuery, filtro])

  const showTrending = !query.trim() && trending.length > 0
  const showEmpty = !loading && !error && query.trim() && results.length === 0

  // separa pessoas de mídias para renderizar em layouts diferentes
  const mediaItems = results.filter((r): r is TMDBMediaItem => !isPerson(r))
  const peopleItems = results.filter((r): r is TMDBPerson => isPerson(r))

  return (
    <PageLayout noPadding>

      <div className="sticky top-0 z-40 space-y-3 bg-[#0f0f13]/95 px-4 pt-5 pb-3 backdrop-blur-xl">
        <h1 className="text-xl font-bold text-[#f1f1f3]">Pesquisar</h1>

        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a5a72]"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filmes, séries, pessoas..."
            aria-label="Buscar filmes, séries e pessoas"
            className="w-full rounded-xl border border-[#2a2a38] bg-[#1c1c24] py-3 pl-10 pr-10 text-base text-[#f1f1f3] placeholder-[#5a5a72] outline-none transition-colors focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a5a72] transition-colors hover:text-[#9898ac]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <FiltroPesquisa filtro={filtro} onChange={setFiltro} />
      </div>

      <div className="px-4 pt-3 pb-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-[#5a5a72]" role="status">
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
            <span className="text-sm">Buscando...</span>
          </div>
        )}

        {/* Erro */}
        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle size={32} className="text-red-400" aria-hidden="true" />
            <p className="text-sm text-[#9898ac]">{error}</p>
          </div>
        )}

        {/* Sem resultados */}
        {showEmpty && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Search size={32} className="text-[#2a2a38]" aria-hidden="true" />
            <p className="text-sm font-medium text-[#9898ac]">Nenhum resultado para</p>
            <p className="text-sm text-[#5a5a72]">"{query}"</p>
          </div>
        )}

        {/* Resultados */}
        {!loading && !error && results.length > 0 && (
          <section aria-label="Resultados da busca" className="space-y-5">
            <p className="text-xs text-[#5a5a72]">
              {totalResults.toLocaleString('pt-BR')} resultados encontrados
            </p>

            {/* Filmes e séries — grid de posters */}
            {mediaItems.length > 0 && (
              <div>
                {filtro === 'all' && peopleItems.length > 0 && (
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5a5a72]">
                    Filmes &amp; Séries
                  </h2>
                )}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {mediaItems.map((item) => (
                    <CardMedia
                      key={`${item.media_type}-${item.id}`}
                      item={item}
                      mediaType={item.media_type}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pessoas — lista horizontal */}
            {peopleItems.length > 0 && (
              <div>
                {filtro === 'all' && mediaItems.length > 0 && (
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5a5a72]">
                    Pessoas
                  </h2>
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

        {/* Trending */}
        {showTrending && !loading && (
          <section aria-label="Em alta esta semana">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-[#6366f1]" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[#f1f1f3]">Em alta esta semana</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {trending.map((item) => (
                <CardMedia
                  key={`${item.media_type}-${item.id}`}
                  item={item}
                  mediaType={item.media_type}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageLayout>
  )
}
