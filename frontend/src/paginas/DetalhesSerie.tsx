import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Heart, ListPlus, Bookmark, Bell, Calendar,
  MessageSquare, Loader2, AlertCircle, ChevronDown, ChevronRight, Check, Play,
  ZoomIn, ImagePlus, X,
} from 'lucide-react'
import {
  getDetalhesSerie,
  getTemporadaSerie,
  getPreferenciaMidia,
  tmdbImage,
  type TMDBSerieDetails,
  type TMDBCastMember,
  type TMDBSeason,
  type TMDBEpisode,
} from '../lib/api'
import { useLongPress } from '../hooks/useLongPress'
import { ModalSelecionarImagem } from '../components/midia/ModalSelecionarImagem'
import { getAuthHeader } from '../lib/supabase'

const HERO_HEIGHT = 420

export function DetalhesSerie() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [serie, setSerie] = useState<TMDBSerieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'sobre' | 'episodios'>('sobre')
  const [seguindo, setSeguindo] = useState(false)

  const [customPoster, setCustomPoster] = useState<string | null>(null)
  const [customBackdrop, setCustomBackdrop] = useState<string | null>(null)
  const [modalImagem, setModalImagem] = useState<'poster' | 'backdrop' | null>(null)

  const heroRef = useRef<HTMLDivElement>(null)
  const backdropImgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getDetalhesSerie(Number(id))
      .then((res) => setSerie(res.data))
      .catch(() => setError('Não foi possível carregar os detalhes.'))
      .finally(() => setLoading(false))
  }, [id])

  // carrega preferência salva ao abrir a página
  useEffect(() => {
    if (!id) return
    getAuthHeader().then((authHeader) => {
      if (!authHeader) return
      getPreferenciaMidia('tv', Number(id), authHeader)
        .then((res) => {
          if (res.data.custom_poster_path) setCustomPoster(res.data.custom_poster_path)
          if (res.data.custom_backdrop_path) setCustomBackdrop(res.data.custom_backdrop_path)
        })
        .catch(() => {})
    })
  }, [id])

  useEffect(() => {
    window.scrollTo(0, 0)
    function onScroll() {
      const y = window.scrollY
      if (backdropImgRef.current)
        backdropImgRef.current.style.transform = `translateY(${y * 0.35}px)`
      if (heroRef.current) {
        const h = Math.max(HERO_HEIGHT - y * 0.5, HERO_HEIGHT * 0.5)
        heroRef.current.style.height = `${h}px`
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const [menuPoster, setMenuPoster] = useState(false)
  const [verPoster, setVerPoster] = useState(false)

  // todos os hooks antes de qualquer early return
  const backdropLongPress = useLongPress({
    onLongPress: () => setModalImagem('backdrop'),
    delay: 500,
  })

  if (loading) return <LoadingState />
  if (error || !serie) return <ErrorState message={error} onBack={() => navigate(-1)} />

  const backdrop = tmdbImage(customBackdrop ?? serie.backdrop_path, 'w780')
  const poster = tmdbImage(customPoster ?? serie.poster_path, 'w342')
  const ano = serie.first_air_date ? new Date(serie.first_air_date).getFullYear() : null
  const criador = serie.created_by?.[0]
  const elenco = serie.credits.cast.slice(0, 15)
  const streaming = serie.providers_br?.flatrate ?? []
  const temporadas = serie.seasons.filter((s) => s.season_number > 0)

  return (
    <div className="min-h-screen bg-[#0f0f13] overflow-x-hidden">

      {modalImagem && (
        <ModalSelecionarImagem
          tmdbId={Number(id)}
          mediaType="tv"
          modo={modalImagem}
          posterAtual={customPoster ?? serie.poster_path}
          backdropAtual={customBackdrop ?? serie.backdrop_path}
          onSalvar={(poster, backdrop) => {
            setCustomPoster(poster)
            setCustomBackdrop(backdrop)
            setModalImagem(null)
          }}
          onFechar={() => setModalImagem(null)}
        />
      )}

      {menuPoster && (
        <MenuPoster
          onVer={() => { setMenuPoster(false); setVerPoster(true) }}
          onAlterar={() => { setMenuPoster(false); setModalImagem('poster') }}
          onFechar={() => setMenuPoster(false)}
        />
      )}

      {verPoster && (
        <VisualizadorPoster
          src={tmdbImage(customPoster ?? serie.poster_path, 'original') ?? poster ?? ''}
          title={serie.name}
          onFechar={() => setVerPoster(false)}
        />
      )}

      <div ref={heroRef} className="relative w-full overflow-hidden" style={{ height: HERO_HEIGHT }}>
        <div
          ref={backdropImgRef}
          className="absolute inset-x-0 top-0 w-full cursor-pointer select-none"
          style={{ height: HERO_HEIGHT + 160, willChange: 'transform' }}
          {...backdropLongPress}
        >
          {backdrop
            ? <img src={backdrop} alt="" aria-hidden="true" className="h-full w-full object-cover object-center" draggable={false} />
            : <div className="h-full w-full bg-[#16161c]" />
          }
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-[#0f0f13]/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f13]/50 via-transparent to-transparent" />

        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="absolute left-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 px-4 pb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight text-white drop-shadow-lg">{serie.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {criador && <span className="text-xs text-[#9898ac]">Criado por {criador.name}</span>}
              {ano && (
                <span className="flex items-center gap-1 text-xs text-[#9898ac]">
                  <Calendar size={11} aria-hidden="true" />{ano}
                </span>
              )}
              <span className="text-xs text-[#9898ac]">
                {serie.number_of_seasons} temp. · {serie.number_of_episodes} ep.
              </span>
            </div>
          </div>
          {poster && (
            <div
              className="h-36 w-24 shrink-0 overflow-hidden rounded-xl shadow-2xl cursor-pointer select-none"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={() => setMenuPoster(true)}
            >
              <img src={poster} alt={`Poster de ${serie.name}`} className="h-full w-full object-cover" draggable={false} />
            </div>
          )}
        </div>
      </div>

      {/* tabs */}
      <div className="sticky top-0 z-30 bg-[#0f0f13]">
        <div className="flex border-b border-[#2a2a38]">
          {(['sobre', 'episodios'] as const).map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              className={[
                'flex-1 py-3.5 text-sm font-semibold uppercase tracking-wider transition-colors',
                abaAtiva === aba
                  ? 'border-b-2 border-[#6366f1] text-[#f1f1f3]'
                  : 'text-[#5a5a72]',
              ].join(' ')}
            >
              {aba === 'sobre' ? 'Sobre' : 'Episódios'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0f0f13] pb-28">
        {abaAtiva === 'sobre'
          ? <AbaSobre serie={serie} elenco={elenco} streaming={streaming} seguindo={seguindo} onSeguir={() => setSeguindo((v) => !v)} />
          : <AbaEpisodios serieId={Number(id)} temporadas={temporadas} />
        }
      </div>
    </div>
  )
}

// Aba Sobre

function AbaSobre({ serie, elenco, streaming, seguindo, onSeguir }: {
  serie: TMDBSerieDetails
  elenco: TMDBCastMember[]
  streaming: any[]
  seguindo: boolean
  onSeguir: () => void
}) {
  return (
    <div className="px-4 pt-4 space-y-6">
      <button
        onClick={onSeguir}
        className={[
          'flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-colors',
          seguindo
            ? 'border-[#6366f1] bg-[#6366f1]/15 text-[#6366f1]'
            : 'border-[#2a2a38] bg-transparent text-[#f1f1f3] hover:border-[#6366f1]/40',
        ].join(' ')}
      >
        <Bell size={15} aria-hidden="true" />
        {seguindo ? 'Seguindo' : 'Seguir'}
      </button>

      <div className="grid grid-cols-3 gap-2">
        <ActionBtn icon={<Heart size={20} />} label="Favoritos" />
        <ActionBtn icon={<ListPlus size={20} />} label="+ Listas" />
        <ActionBtn icon={<Bookmark size={20} />} label="Quero assistir" />
      </div>

      {serie.overview && (
        <Section title="Sinopse">
          <p className="text-sm leading-relaxed text-[#9898ac]">{serie.overview}</p>
        </Section>
      )}

      {serie.genres?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {serie.genres.map((g) => (
            <span key={g.id} className="rounded-full border border-[#2a2a38] bg-[#1c1c24] px-3 py-1 text-xs font-medium text-[#9898ac]">
              {g.name}
            </span>
          ))}
        </div>
      )}

      {elenco.length > 0 && (
        <Section title="Elenco">
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {elenco.map((ator) => <CastCard key={ator.id} ator={ator} />)}
          </div>
        </Section>
      )}

      <Section title="Onde assistir">
        {streaming.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {streaming.map((p: any) => (
              <div key={p.provider_id} title={p.provider_name}
                className="h-12 w-12 overflow-hidden rounded-xl border border-[#2a2a38]">
                <img src={tmdbImage(p.logo_path, 'w185') ?? ''} alt={p.provider_name} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#5a5a72]">Sem informação de streaming para o Brasil.</p>
        )}
      </Section>

      <Section title="Avaliações">
        <button
          className="flex w-full items-center justify-between rounded-xl border border-[#2a2a38] bg-[#1c1c24] px-4 py-3.5 transition-colors hover:border-[#6366f1]/40 hover:bg-[#22222d]"
          aria-label="Ver avaliações"
        >
          <div className="flex items-center gap-3">
            <MessageSquare size={18} className="text-[#6366f1]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#f1f1f3]">Saiba o que estão dizendo...</span>
          </div>
          <ChevronRight size={16} className="text-[#5a5a72]" aria-hidden="true" />
        </button>
      </Section>
    </div>
  )
}

// Aba eps

function AbaEpisodios({ serieId, temporadas }: {
  serieId: number
  temporadas: Array<{ season_number: number; name: string; episode_count: number }>
}) {
  const [aberta, setAberta] = useState<number | null>(temporadas[0]?.season_number ?? null)
  const [cache, setCache] = useState<Record<number, TMDBSeason>>({})
  const [loadingT, setLoadingT] = useState<number | null>(null)
  const [vistos, setVistos] = useState<Record<string, boolean>>({})

  async function toggle(numero: number) {
    if (aberta === numero) { setAberta(null); return }
    setAberta(numero)
    if (cache[numero]) return
    setLoadingT(numero)
    try {
      const { data } = await getTemporadaSerie(serieId, numero)
      setCache((c) => ({ ...c, [numero]: data }))
    } catch {
      // silencioso
    } finally {
      setLoadingT(null)
    }
  }

  function toggleVisto(key: string) {
    setVistos((v) => ({ ...v, [key]: !v[key] }))
  }

  useEffect(() => {
    if (temporadas[0]) toggle(temporadas[0].season_number)
  }, [serieId]) // eslint-disable-line

  return (
    <div className="px-4 pt-4 space-y-3">
      {temporadas.map((t) => {
        const isOpen = aberta === t.season_number
        const season = cache[t.season_number]
        const isLoading = loadingT === t.season_number
        const vistosCount = season
          ? season.episodes.filter((ep) => vistos[`${t.season_number}-${ep.episode_number}`]).length
          : 0
        const allWatched = season && vistosCount === season.episodes.length

        return (
          <div key={t.season_number} className="overflow-hidden rounded-2xl border border-[#2a2a38] bg-[#1c1c24]">

            {/* Header da temporada */}
            <button
              onClick={() => toggle(t.season_number)}
              className="flex w-full items-center justify-between px-4 py-4"
              aria-expanded={isOpen}
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-[#f1f1f3]">{t.name}</p>
                <p className="mt-0.5 text-xs text-[#5a5a72]">
                  {vistosCount}/{t.episode_count} episódios assistidos
                </p>
              </div>
              <div className="flex items-center gap-2.5">


                {allWatched && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6366f1]">
                    <Check size={11} className="text-white" aria-hidden="true" />
                  </span>
                )}
                {isLoading && <Loader2 size={14} className="animate-spin text-[#5a5a72]" />}
                <ChevronDown
                  size={18}
                  className={['text-[#5a5a72] transition-transform duration-200', isOpen ? 'rotate-180' : ''].join(' ')}
                  aria-hidden="true"
                />
              </div>
            </button>

            {/* barrinha de progresso  simples*/}
            {season && season.episodes.length > 0 && (
              <div className="px-4 pb-3">
                <div className="h-1 w-full overflow-hidden rounded-full bg-[#2a2a38]">
                  <div
                    className="h-full rounded-full bg-[#6366f1] transition-all duration-300"
                    style={{ width: `${(vistosCount / season.episodes.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Lista de episódios */}
            {isOpen && season && (
              <div className="border-t border-[#2a2a38]">
                {season.episodes.map((ep) => {
                  const key = `${t.season_number}-${ep.episode_number}`
                  return (
                    <EpisodeRow
                      key={ep.id}
                      ep={ep}
                      visto={!!vistos[key]}
                      onToggleVisto={() => toggleVisto(key)}
                    />
                  )
                })}
              </div>
            )}


            {isOpen && isLoading && (
              <div className="border-t border-[#2a2a38] flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-[#5a5a72]" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// linha de episódio

function EpisodeRow({ ep, visto, onToggleVisto }: {
  ep: TMDBEpisode
  visto: boolean
  onToggleVisto: () => void
}) {
  const thumb = tmdbImage(ep.still_path, 'w185')

  return (
    <div className="flex items-center gap-3 border-b border-[#2a2a38] px-3 py-3 last:border-0">
      <button
        onClick={onToggleVisto}
        aria-label={visto ? 'Marcar como não visto' : 'Marcar como visto'}
        className={[
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
          visto
            ? 'border-[#6366f1] bg-[#6366f1] text-white'
            : 'border-[#2a2a38] text-transparent hover:border-[#6366f1]/50',
        ].join(' ')}
      >
        <Check size={12} aria-hidden="true" />
      </button>

      <div className="h-[3.75rem] w-[6.5rem] shrink-0 overflow-hidden rounded-lg bg-[#16161c]">
        {thumb
          ? <img src={thumb} alt="" aria-hidden="true" loading="lazy" className="h-full w-full object-cover" />
          : <div className="flex h-full w-full items-center justify-center text-[#5a5a72]"><Play size={16} /></div>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#f1f1f3] line-clamp-2 leading-snug">
          {ep.episode_number}. {ep.name}
        </p>
        {ep.runtime && (
          <p className="mt-0.5 text-xs text-[#5a5a72]">{ep.runtime} min</p>
        )}
      </div>

      <ChevronRight size={15} className="shrink-0 text-[#2a2a38]" aria-hidden="true" />
    </div>
  )
}

// Componentes compartilhados

function ActionBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1.5 rounded-xl border border-[#2a2a38] bg-[#1c1c24] py-3.5 text-[#9898ac] transition-colors hover:border-[#6366f1]/40 hover:text-[#f1f1f3] active:bg-[#22222d]">
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-[#f1f1f3]">{title}</h2>
      {children}
    </div>
  )
}

function CastCard({ ator }: { ator: TMDBCastMember }) {
  const foto = tmdbImage(ator.profile_path, 'w185')
  return (
    <div className="flex w-[4.5rem] shrink-0 flex-col gap-1.5">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#1c1c24] ring-1 ring-[#2a2a38]">
        {foto
          ? <img src={foto} alt={ator.name} loading="lazy" className="h-full w-full object-cover object-top" />
          : <div className="flex h-full w-full items-center justify-center text-xl font-bold text-[#5a5a72]">{ator.name[0]}</div>
        }
      </div>
      <p className="text-center text-[10px] font-medium leading-tight text-[#f1f1f3] line-clamp-2">{ator.name}</p>
      <p className="text-center text-[9px] leading-tight text-[#5a5a72] line-clamp-1">{ator.character}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f13]">
      <Loader2 size={28} className="animate-spin text-[#6366f1]" aria-label="Carregando" />
    </div>
  )
}

function ErrorState({ message, onBack }: { message: string | null; onBack: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f0f13] px-6 text-center">
      <AlertCircle size={36} className="text-red-400" aria-hidden="true" />
      <p className="text-sm text-[#9898ac]">{message ?? 'Algo deu errado.'}</p>
      <button onClick={onBack} className="rounded-xl bg-[#6366f1] px-6 py-2.5 text-sm font-medium text-white">
        Voltar
      </button>
    </div>
  )
}

// Bottom sheet: Ver poster / Alterar poster
function MenuPoster({ onVer, onAlterar, onFechar }: {
  onVer: () => void
  onAlterar: () => void
  onFechar: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="Opções do poster">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} aria-hidden="true" />
      <div
        className="relative w-full rounded-t-3xl border-t border-[#2a2a38] bg-[#16161c] px-4 pt-4"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#2a2a38]" aria-hidden="true" />
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#5a5a72]">Poster</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onVer}
            className="flex items-center gap-3 rounded-xl bg-[#1c1c24] px-4 py-3.5 text-sm font-medium text-[#f1f1f3] transition-colors hover:bg-[#22222d]"
          >
            <ZoomIn size={18} className="text-[#9898ac]" aria-hidden="true" />
            Ver poster
          </button>
          <button
            onClick={onAlterar}
            className="flex items-center gap-3 rounded-xl bg-[#1c1c24] px-4 py-3.5 text-sm font-medium text-[#6366f1] transition-colors hover:bg-[#22222d]"
          >
            <ImagePlus size={18} className="text-[#6366f1]" aria-hidden="true" />
            Alterar poster ou Banner
          </button>
          <button
            onClick={onFechar}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#5a5a72] transition-colors hover:text-[#9898ac]"
          >
            <X size={18} aria-hidden="true" />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// visualizador de poster em tela cheia
function VisualizadorPoster({ src, title, onFechar }: {
  src: string
  title: string
  onFechar: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`Poster de ${title}`}
      onClick={onFechar}
    >
      <button
        className="absolute z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: '1rem' }}
        onClick={onFechar}
        aria-label="Fechar"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <img
        src={src}
        alt={`Poster de ${title}`}
        className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  )
}
