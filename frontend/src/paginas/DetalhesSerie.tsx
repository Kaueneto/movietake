import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Heart, ListPlus, Bookmark, Bell, Calendar,
  MessageSquare, Loader2, AlertCircle, ChevronDown, ChevronRight, Check, Play,
  ZoomIn, ImagePlus, X, Eye,
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
import { useUserActions } from '../hooks/useUserActions'
import { ModalSelecionarImagem } from '../components/midia/ModalSelecionarImagem'
import { ModalOrdemCronologica } from '../components/serie/ModalOrdemCronologica'
import { getAuthHeader, supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { getPrefCache, setPrefCache } from '../lib/prefsCache'

const HERO_HEIGHT = 420

function dataLocalHoje() {
  const agora = new Date()
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12)
}

function episodioAindaNaoEstreou(ep: TMDBEpisode) {
  if (!ep.air_date) return false
  return new Date(`${ep.air_date}T12:00:00`) > dataLocalHoje()
}

function textoEstreia(ep: TMDBEpisode) {
  if (!ep.air_date) return null
  const data = new Date(`${ep.air_date}T12:00:00`)
  const dias = Math.round((data.getTime() - dataLocalHoje().getTime()) / 86_400_000)
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return 'Amanhã'
  if (dias <= 15) return `Em ${dias} dias`
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DetalhesSerie() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profileId } = useAuth()

  const [serie, setSerie] = useState<TMDBSerieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'sobre' | 'episodios'>('sobre')
  const [seguindo, setSeguindo] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [loadingSeguindo, setLoadingSeguindo] = useState(false)

  // inicia do cache — sem flash ao abrir a mesma tela novamente
  const cachedPrefs = getPrefCache('tv', Number(id) || 0)
  const [customPoster, setCustomPoster] = useState<string | null>(cachedPrefs?.poster ?? null)
  const [customBackdrop, setCustomBackdrop] = useState<string | null>(cachedPrefs?.backdrop ?? null)
  const [modalImagem, setModalImagem] = useState<'poster' | 'backdrop' | null>(null)
  const [cacheTemporadas, setCacheTemporadas] = useState<Record<number, TMDBSeason>>({})
  const [episodiosAssistidosCarregados, setEpisodiosAssistidosCarregados] = useState(false)
  // episodiosAssistidos: episode_tmdb_id → watched_at ISO string (presença = assistido)
  const [episodiosAssistidos, setEpisodiosAssistidos] = useState<Record<number, string>>({})

  const heroRef = useRef<HTMLDivElement>(null)
  const backdropImgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id || !profileId) return
    setLoading(true)
    setError(null)
    setEpisodiosAssistidosCarregados(false)
    getDetalhesSerie(Number(id))
      .then((res) => {
        setSerie(res.data)
        // Carrega todas as temporadas assim que a série é recebida
        const temporadasDisponiveis = res.data.seasons.filter((s) => s.season_number > 0)
        const carregarTemporadas = async () => {
          try {
            const resultados = await Promise.all(
              temporadasDisponiveis.map((t) => getTemporadaSerie(Number(id), t.season_number).then((r) => r.data))
            )
            setCacheTemporadas((c) => {
              const next = { ...c }
              resultados.forEach((s) => { next[s.season_number] = s })
              return next
            })
          } catch {
            // silencioso
          }
        }
        carregarTemporadas()
      })
      .catch(() => setError('Não foi possível carregar os detalhes.'))
      .finally(() => setLoading(false))

    // Carrega episódios assistidos
    void (async () => {
      try {
        const { data } = await supabase
          .from('series_episode_history')
          .select('episode_tmdb_id, watched_at')
          .eq('user_id', profileId)
          .eq('tmdb_id', Number(id))
        const mapa: Record<number, string> = {}
        for (const row of data ?? []) mapa[row.episode_tmdb_id] = row.watched_at
        setEpisodiosAssistidos(mapa)
      } finally {
        setEpisodiosAssistidosCarregados(true)
      }
    })()

    // Carrega estado de seguindo
    supabase
      .from('series_progress')
      .select('status')
      .eq('user_id', profileId)
      .eq('tmdb_id', Number(id))
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSeguindo(true)
          setPausado(data.status === 'paused')
        }
      })
  }, [id, profileId])

  async function toggleSeguindo() {
    if (!profileId || !id || loadingSeguindo) return
    setLoadingSeguindo(true)
    try {
      if (!seguindo) {
        // Começou a seguir > watching
        await supabase
          .from('series_progress')
          .upsert(
            { user_id: profileId, tmdb_id: Number(id), status: 'watching' },
            { onConflict: 'user_id,tmdb_id' }
          )
        setSeguindo(true)
        setPausado(false)
      } else if (!pausado) {
        // estava seguindo > pausa
        await supabase
          .from('series_progress')
          .update({ status: 'paused' })
          .eq('user_id', profileId)
          .eq('tmdb_id', Number(id))
        setPausado(true)
      } else {
        // Estava pausado > retoma
        await supabase
          .from('series_progress')
          .update({ status: 'watching' })
          .eq('user_id', profileId)
          .eq('tmdb_id', Number(id))
        setPausado(false)
      }
    } finally {
      setLoadingSeguindo(false)
    }
  }

  // carrega preferência salva ao abrir a página
  useEffect(() => {
    if (!id) return
    getAuthHeader().then((authHeader) => {
      if (!authHeader) return
      getPreferenciaMidia('tv', Number(id), authHeader)
        .then((res) => {
          if (res.data.custom_poster_path) setCustomPoster(res.data.custom_poster_path)
          if (res.data.custom_backdrop_path) setCustomBackdrop(res.data.custom_backdrop_path)
          setPrefCache('tv', Number(id), res.data.custom_poster_path, res.data.custom_backdrop_path)
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
        heroRef.current.style.height = `calc(${h}px + env(safe-area-inset-top, 0px))`
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

  const acoes = useUserActions(Number(id) || 0, 'tv')

  if (loading) return <LoadingState />
  if (error || !serie) return <ErrorState message={error} onBack={() => navigate(-1)} />

  const backdrop = tmdbImage(customBackdrop ?? serie.backdrop_path, 'original')
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
            setPrefCache('tv', Number(id), poster, backdrop)
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

      <div
        ref={heroRef}
        className="relative w-full overflow-hidden"
        style={{
          height: `calc(${HERO_HEIGHT}px + env(safe-area-inset-top, 0px))`,
          marginTop: 'calc(env(safe-area-inset-top, 0px) * -1)',
        }}
      >
        <div
          ref={backdropImgRef}
          className="absolute inset-x-0 top-0 w-full cursor-pointer select-none"
          style={{ height: HERO_HEIGHT + 160, willChange: 'transform' }}
          {...backdropLongPress}
        >
          {backdrop
            ? <img src={backdrop} alt="" aria-hidden="true" className="h-full w-full object-cover object-top" draggable={false} />
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
                'flex-1 py-3.5 text-base font-semibold font-segoe  tracking-wider transition-colors',
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
          ? <AbaSobre serie={serie} elenco={elenco} streaming={streaming} seguindo={seguindo} pausado={pausado} loadingSeguindo={loadingSeguindo} onSeguir={toggleSeguindo} acoes={acoes} />
          : <AbaEpisodios serieId={Number(id)} temporadas={temporadas} cacheTemporadas={cacheTemporadas} setCacheTemporadas={setCacheTemporadas} episodiosAssistidos={episodiosAssistidos} episodiosAssistidosCarregados={episodiosAssistidosCarregados} setEpisodiosAssistidos={setEpisodiosAssistidos} onEpisodioMarcado={() => { setSeguindo(true); setPausado(false) }} />        }
      </div>
    </div>
  )
}

// Aba Sobre

function AbaSobre({ serie, elenco, streaming, seguindo, pausado, loadingSeguindo, onSeguir, acoes }: {
  serie: TMDBSerieDetails
  elenco: TMDBCastMember[]
  streaming: any[]
  seguindo: boolean
  pausado: boolean
  loadingSeguindo: boolean
  onSeguir: () => void
  acoes: ReturnType<typeof useUserActions>
}) {
  return (
    <div className="px-4 pt-4 space-y-6">
      <button
        onClick={onSeguir}
        disabled={loadingSeguindo}
        className={[
          'flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-60',
          seguindo && !pausado
            ? 'border-[#6366f1] bg-[#6366f1]/15 text-[#6366f1]'
            : pausado
              ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
              : 'border-[#2a2a38] bg-transparent text-[#f1f1f3] hover:border-[#6366f1]/40',
        ].join(' ')}
      >
        {loadingSeguindo
          ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          : <Bell size={15} aria-hidden="true" />
        }
        {!seguindo ? 'Seguir' : pausado ? 'Retomar' : 'Seguindo'}
      </button>

      <div className="grid grid-cols-3 gap-2">
        <ActionBtn
          icon={acoes.loadingFavorito ? <Loader2 size={25} className="animate-spin" /> : <Heart size={25} className={acoes.favorito ? 'fill-[#ef4444] text-[#ef4444]' : ''} />}
          label="Favoritos"
          ativo={acoes.favorito}
          corAtivo="#ef4444"
          onClick={acoes.toggleFavorito}
        />
        <ActionBtn
          icon={<ListPlus size={25} />}
          label="Listas"
          corAtivo="#a855f7"
        />
        <ActionBtn
          icon={acoes.loadingWatchlist ? <Loader2 size={25} className="animate-spin" /> : <Bookmark size={25} className={acoes.naWatchlist ? 'fill-current' : ''} />}
          label="Quero assistir"
          ativo={acoes.naWatchlist}
          corAtivo="#eab308"
          onClick={acoes.toggleWatchlist}
        />
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

function AbaEpisodios({ serieId, temporadas, cacheTemporadas, setCacheTemporadas, episodiosAssistidos, episodiosAssistidosCarregados, setEpisodiosAssistidos, onEpisodioMarcado }: {
  serieId: number
  temporadas: Array<{ season_number: number; name: string; episode_count: number }>
  cacheTemporadas: Record<number, TMDBSeason>
  setCacheTemporadas: React.Dispatch<React.SetStateAction<Record<number, TMDBSeason>>>
  episodiosAssistidos: Record<number, string>
  episodiosAssistidosCarregados: boolean
  setEpisodiosAssistidos: React.Dispatch<React.SetStateAction<Record<number, string>>>
  onEpisodioMarcado: () => void
}) {
  const { profileId } = useAuth()
  const [aberta, setAberta] = useState<number | null>(null)
  const [loadingT, setLoadingT] = useState<number | null>(null)
  const [salvandoEp, setSalvandoEp] = useState<number | null>(null)

  // estado do modal de ordem cronológica
  type PendingAction =
    | { tipo: 'episodio'; ep: TMDBEpisode }
    | { tipo: 'temporada'; season: TMDBSeason }

  const [pendente, setPendente] = useState<PendingAction | null>(null)
  const [qtdAnteriores, setQtdAnteriores] = useState(0)

  // busca todas as temporadas anteriores que ainda não estão no cache
  async function garantirTemporadasAnteriores(targetSeason: number) {
    const faltam = temporadas
      .filter((t) => t.season_number < targetSeason && !cacheTemporadas[t.season_number])
    if (faltam.length === 0) return

    const resultados = await Promise.all(
      faltam.map((t) => getTemporadaSerie(serieId, t.season_number).then((r) => r.data))
    )
    setCacheTemporadas((c) => {
      const next = { ...c }
      resultados.forEach((s) => { next[s.season_number] = s })
      return next
    })
  }

  // retorna todos os episódios anteriores não assistidos (usa cache atualizado)
  function episodiosAnterioresNaoVistos(
    targetSeason: number,
    targetEpisode: number,
    cacheAtualizado: Record<number, TMDBSeason>
  ): TMDBEpisode[] {
    const anteriores: TMDBEpisode[] = []
    for (const [sNum, season] of Object.entries(cacheAtualizado)) {
      const s = Number(sNum)
      for (const ep of season.episodes) {
        if (episodiosAssistidos[ep.id]) continue
        if (s < targetSeason) anteriores.push(ep)
        else if (s === targetSeason && ep.episode_number < targetEpisode) anteriores.push(ep)
      }
    }
    return anteriores
  }

  // salva lista de episódios no banco e atualiza series_progress para 'watching'
  async function salvarEpisodios(eps: TMDBEpisode[]) {
    const episodiosDisponiveis = eps.filter((ep) => !episodioAindaNaoEstreou(ep))
    if (!profileId || episodiosDisponiveis.length === 0) return
    const agora = new Date().toISOString()
    await supabase.from('series_episode_history').upsert(
      episodiosDisponiveis.map((ep) => ({
        user_id: profileId,
        tmdb_id: serieId,
        season_number: ep.season_number,
        episode_number: ep.episode_number,
        episode_tmdb_id: ep.id,
      })),
      { onConflict: 'user_id,episode_tmdb_id' }
    )
    setEpisodiosAssistidos((v) => {
      const next = { ...v }
      episodiosDisponiveis.forEach((ep) => { next[ep.id] = agora })
      return next
    })
    // Garante que series_progress existe e está como 'watching'
    supabase
      .from('series_progress')
      .upsert(
        { user_id: profileId, tmdb_id: serieId, status: 'watching' },
        { onConflict: 'user_id,tmdb_id' }
      )
    onEpisodioMarcado()
  }

  async function toggle(numero: number) {
    if (aberta === numero) { setAberta(null); return }
    setAberta(numero)
    if (cacheTemporadas[numero]) return
    setLoadingT(numero)
    try {
      const { data } = await getTemporadaSerie(serieId, numero)
      setCacheTemporadas((c) => ({ ...c, [numero]: data }))
    } catch {
      // silencioso
    } finally {
      setLoadingT(null)
    }
  }

  async function toggleEpisodio(ep: TMDBEpisode) {
    if (!profileId || salvandoEp === ep.id || episodioAindaNaoEstreou(ep)) return
    const jaVisto = !!episodiosAssistidos[ep.id]

    // se está desmarcando, sem necessidade de verificação
    if (jaVisto) {
      setSalvandoEp(ep.id)
      setEpisodiosAssistidos((v) => { const next = { ...v }; delete next[ep.id]; return next })
      try {
        await supabase
          .from('series_episode_history')
          .delete()
          .eq('user_id', profileId)
          .eq('episode_tmdb_id', ep.id)
      } catch {
        setEpisodiosAssistidos((v) => ({ ...v, [ep.id]: new Date().toISOString() }))
      } finally {
        setSalvandoEp(null)
      }
      return
    }
    const cacheAtual = { ...cacheTemporadas }
    // inclui a temporada atual se já carregada
    const anteriores = episodiosAnterioresNaoVistos(ep.season_number, ep.episode_number, cacheAtual)
    if (anteriores.length > 0) {
      setQtdAnteriores(anteriores.length)
      setPendente({ tipo: 'episodio', ep })
      return
    }

    // marca diretamente
    const agora = new Date().toISOString()
    setSalvandoEp(ep.id)
    setEpisodiosAssistidos((v) => ({ ...v, [ep.id]: agora }))
    try {
      await supabase.from('series_episode_history').upsert(
        { user_id: profileId, tmdb_id: serieId, season_number: ep.season_number, episode_number: ep.episode_number, episode_tmdb_id: ep.id },
        { onConflict: 'user_id,episode_tmdb_id' }
      )
      // Garante que series_progress existe e está como 'watching'
      supabase
        .from('series_progress')
        .upsert(
          { user_id: profileId, tmdb_id: serieId, status: 'watching' },
          { onConflict: 'user_id,tmdb_id' }
        )
      onEpisodioMarcado()
    } catch {
      setEpisodiosAssistidos((v) => { const next = { ...v }; delete next[ep.id]; return next })
    } finally {
      setSalvandoEp(null)
    }
  }

  async function marcarTemporadaInteira(season: TMDBSeason) {
    if (!profileId) return
    const episodiosDisponiveis = season.episodes.filter((ep) => !episodioAindaNaoEstreou(ep))
    if (episodiosDisponiveis.length === 0) return
    const todosVistos = episodiosDisponiveis.every((ep) => !!episodiosAssistidos[ep.id])

    if (todosVistos) {
      const ids = episodiosDisponiveis.map((ep) => ep.id)
      setEpisodiosAssistidos((v) => { const next = { ...v }; ids.forEach((id) => delete next[id]); return next })
      await supabase.from('series_episode_history').delete()
        .eq('user_id', profileId).eq('tmdb_id', serieId).in('episode_tmdb_id', ids)
      return
    }

    //verifica episódios anteriores à temporada — carrega temporadas faltantes
    const primeiroNaoVisto = episodiosDisponiveis.find((ep) => !episodiosAssistidos[ep.id])
    if (!primeiroNaoVisto) return
    await garantirTemporadasAnteriores(season.season_number)
    const cacheAtual = { ...cacheTemporadas }
    const anteriores = episodiosAnterioresNaoVistos(season.season_number, primeiroNaoVisto.episode_number, cacheAtual)

    if (anteriores.length > 0) {
      setQtdAnteriores(anteriores.length)
      setPendente({ tipo: 'temporada', season })
      return
    }

    await salvarEpisodios(season.episodes.filter((ep) => !episodiosAssistidos[ep.id]))
  }

  // resolução do modal
  async function confirmarMarcarTudo() {
    if (!pendente) return
    if (pendente.tipo === 'episodio') {
      const cacheAtual = { ...cacheTemporadas }
      const anteriores = episodiosAnterioresNaoVistos(pendente.ep.season_number, pendente.ep.episode_number, cacheAtual)
      await salvarEpisodios([...anteriores, pendente.ep])
    } else {
      const primeiroNaoVisto = pendente.season.episodes.find((ep) => !episodiosAssistidos[ep.id])
      if (primeiroNaoVisto) {
        const cacheAtual = { ...cacheTemporadas }
        const anteriores = episodiosAnterioresNaoVistos(pendente.season.season_number, primeiroNaoVisto.episode_number, cacheAtual)
        await salvarEpisodios([...anteriores, ...pendente.season.episodes.filter((ep) => !episodiosAssistidos[ep.id])])
      }
    }
    setPendente(null)
  }

  async function confirmarApenasEste() {
    if (!pendente || !profileId) return
    if (pendente.tipo === 'episodio') {
      const agora = new Date().toISOString()
      setSalvandoEp(pendente.ep.id)
      setEpisodiosAssistidos((v) => ({ ...v, [pendente.ep.id]: agora }))
      try {
        await supabase.from('series_episode_history').upsert(
          { user_id: profileId, tmdb_id: serieId, season_number: pendente.ep.season_number, episode_number: pendente.ep.episode_number, episode_tmdb_id: pendente.ep.id },
          { onConflict: 'user_id,episode_tmdb_id' }
        )
      } catch {
        setEpisodiosAssistidos((v) => { const next = { ...v }; delete next[pendente.ep.id]; return next })
      } finally {
        setSalvandoEp(null)
      }
    } else {
      await salvarEpisodios(pendente.season.episodes.filter((ep) => !episodiosAssistidos[ep.id]))
    }
    setPendente(null)
  }

  // todos os episódios em ordem linear, de todas as temporadas carregadas
  const todosEpisodiosLinear: TMDBEpisode[] = temporadas
    .flatMap((t) => cacheTemporadas[t.season_number]?.episodes ?? [])

  return (
    <div className="pt-4 space-y-4">
      {/* modal de ordem cronológica */}
      {pendente && (
        <ModalOrdemCronologica
          qtdAnteriores={qtdAnteriores}
          onMarcarTudo={confirmarMarcarTudo}
          onApenasEste={confirmarApenasEste}
          onFechar={() => setPendente(null)}
        />
      )}

      {/* Faixa linear de episódios */}
      {todosEpisodiosLinear.length > 0 && (
        <FaixaLinearEpisodios
           episodios={todosEpisodiosLinear}
           episodiosAssistidos={episodiosAssistidos}
           episodiosAssistidosCarregados={episodiosAssistidosCarregados}
           salvandoEp={salvandoEp}
          onToggle={toggleEpisodio}
          serieId={serieId}
        />
      )}

      {/* Acordeons por temporada */}
     <div className="space-y-4 px-4">
  {temporadas.map((t) => {
    const isOpen = aberta === t.season_number
    const season = cacheTemporadas[t.season_number]
    const isLoading = loadingT === t.season_number

    const vistosCount = season
      ? season.episodes.filter((ep) => !!episodiosAssistidos[ep.id]).length
      : 0

    const allWatched =
      season &&
      season.episodes.length > 0 &&
      vistosCount === season.episodes.length
    const episodiosEstreados = season?.episodes.filter((ep) => !episodioAindaNaoEstreou(ep)) ?? []
    const vistosEstreados = episodiosEstreados.filter((ep) => !!episodiosAssistidos[ep.id]).length
    const temporadaEmAndamento = season?.episodes.some(episodioAindaNaoEstreou) ?? false
    const temporadaConcluida = Boolean(allWatched && !temporadaEmAndamento)

    return (
      <div
        key={t.season_number}
        className="rounded-3xl bg-white/[0.03] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.05]"
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4">
          {season ? (
            <button
              onClick={() => marcarTemporadaInteira(season)}
              aria-label={
                temporadaConcluida
                  ? 'Desmarcar temporada'
                  : 'Marcar temporada como assistida'
              }
              className={[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200',
                allWatched
                  ? 'bg-green-500  shadow-lg'
                  : 'bg-white/10 backdrop-blur-md hover:bg-white/20',
              ].join(' ')}
            >
              {temporadaConcluida && (
                <Check
                  size={14}
                  className="text-black"
                  aria-hidden="true"
                  
                />
              )}
            </button>
          ) : (
            <div className="h-7 w-7 rounded-full bg-white/10" />
          )}

          <button
            onClick={() => toggle(t.season_number)}
            className="flex flex-1 items-center justify-between text-left"
            aria-expanded={isOpen}
          >
            <div>
              <h3 className="text-base font-semibold text-white">
                {t.name}
              </h3>

              <p className="mt-1 text-sm text-zinc-400">
                {vistosCount}/{t.episode_count} episódios assistidos
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isLoading && (
                <Loader2
                  size={16}
                  className="animate-spin text-zinc-500"
                />
              )}

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl">
                <ChevronDown
                  size={18}
                  className={[
                    'transition-transform duration-300 text-white',
                    isOpen ? 'rotate-180' : '',
                  ].join(' ')}
                />
              </div>
            </div>
          </button>
        </div>

        {/* Barra */}
        {season && season.episodes.length > 0 && (
          <div className="px-5 pb-4">
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={[
                  'h-full rounded-full transition-all duration-500',
                  temporadaConcluida ? 'bg-green-500' : 'bg-amber-400',
                ].join(' ')}
                style={{
                  width: `${
                    (vistosEstreados / Math.max(episodiosEstreados.length, 1)) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Episódios */}
        {isOpen && season && (
          <div className="px-3 pb-3">
            {season.episodes.map((ep) => (
              <EpisodeRow
                key={ep.id}
                ep={ep}
                watchedAt={episodiosAssistidos[ep.id] ?? null}
                salvando={salvandoEp === ep.id}
                onToggleVisto={() => toggleEpisodio(ep)}
                serieId={serieId}
              />
            ))}
          </div>
        )}

        {isOpen && isLoading && (
          <div className="flex justify-center py-8">
            <Loader2
              size={28}
              className="animate-spin text-zinc-500"
            />
          </div>
        )}
      </div>
    )
  })}

      </div>
    </div>
  )
}

// linha de episódio

function EpisodeRow({ ep, watchedAt, onToggleVisto, serieId, salvando }: {
  ep: TMDBEpisode
  watchedAt: string | null
  onToggleVisto: () => void
  serieId: number
  salvando?: boolean
}) {
  const navigate = useNavigate()
  const thumb = tmdbImage(ep.still_path, 'w185')
  const visto = watchedAt !== null
  const estreiaFutura = episodioAindaNaoEstreou(ep)
  const previsaoEstreia = estreiaFutura ? textoEstreia(ep) : null

  const dataAssistido = watchedAt
    ? new Date(watchedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <div className={['flex items-center gap-3 border-b border-[#2a2a38] px-3 py-3 last:border-0 transition-colors', visto ? 'bg-[#161618]' : ''].join(' ')}>
      {/* check — área isolada */}
      <button
        onClick={onToggleVisto}
        disabled={salvando || estreiaFutura}
        aria-label={visto ? 'Marcar como não visto' : 'Marcar como visto'}
        className={[
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
          visto
            ? 'border-green-500 bg-green-500 scale-110 shadow-sm shadow-green-500/30'
            : 'border-[#2a2a38] hover:border-green-500/50',
          salvando || estreiaFutura ? 'cursor-not-allowed opacity-40' : '',
        ].join(' ')}
      >
        {salvando
          ? <Loader2 size={11} className="animate-spin text-[#5a5a72]" aria-hidden="true" />
          : visto
            ? <Check size={13} className="text-black" aria-hidden="true" />
            : null
        }
      </button>

      {/* area clicável para detalhes: thumbnail + texto + seta */}
      <button
        onClick={() => navigate(`/series/${serieId}/temporadas/${ep.season_number}/episodios/${ep.episode_number}`)}
        className="flex flex-1 min-w-0 items-center gap-3 text-left active:opacity-1000 transition-opacity"
        aria-label={`Ver detalhes de ${ep.name}`}
      >
        <div className={['h-[3.75rem] w-[6.5rem] shrink-0 overflow-hidden rounded-lg bg-[#16161c]', visto ? 'opacity-50' : ''].join(' ')}>
          {thumb
            ? <img src={thumb} alt="" aria-hidden="true" loading="lazy" className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center text-[#5a5a72]"><Play size={16} /></div>
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className={['text-sm font-medium line-clamp-2 leading-snug', visto ? 'text-[#5a5a72]' : 'text-[#f1f1f3]'].join(' ')}>
            {ep.episode_number}. {ep.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {ep.runtime && (
              <span className="text-xs text-[#5a5a72]">{ep.runtime} min</span>
            )}
            {dataAssistido && (
              <span className="flex items-center gap-1 text-[10px] text-green-500/80">
                <Eye size={9} aria-hidden="true" />
                {dataAssistido}
              </span>
            )}
            {previsaoEstreia && (
              <span className="text-xs font-medium text-amber-300">
                Estreia: {previsaoEstreia}
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={15} className="shrink-0 text-[#3a3a50]" aria-hidden="true" />
      </button>
    </div>
  )
}

// Faixa linear de episódios — scroll horizontal, centraliza no próximo a assistir

function FaixaLinearEpisodios({ episodios, episodiosAssistidos, episodiosAssistidosCarregados, salvandoEp, onToggle, serieId }: {
  episodios: TMDBEpisode[]
  episodiosAssistidos: Record<number, string>
  episodiosAssistidosCarregados: boolean
  salvandoEp: number | null
  onToggle: (ep: TMDBEpisode) => void
  serieId: number
}) {
  const proximoRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const ultimoIdx = episodios.reduce((ultimo, ep, idx) => {
    if (!episodiosAssistidos[ep.id]) return ultimo
    if (ultimo === -1 || episodiosAssistidos[ep.id] > episodiosAssistidos[episodios[ultimo].id]) return idx
    return ultimo
  }, -1)
  const proximoIdx = ultimoIdx >= 0
    ? episodios.findIndex((ep, idx) => idx > ultimoIdx && !episodiosAssistidos[ep.id])
    : episodios.findIndex((ep) => !episodiosAssistidos[ep.id])
  const focoIdx = proximoIdx === -1 ? Math.max(0, ultimoIdx) : proximoIdx

  // Aguarda o histórico real antes de posicionar a faixa. O cartão alvo é
  // centralizado pelo próprio navegador, evitando cálculos imprecisos de largura.
  useEffect(() => {
    if (!episodiosAssistidosCarregados || !proximoRef.current) return
    proximoRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' })
  }, [episodiosAssistidosCarregados, focoIdx])

  return (
  <div className="pb-5">
    <div
      className="flex gap-3 overflow-x-auto px-4 py-1"
      style={{ scrollbarWidth: 'none', touchAction: 'pan-x' }}
    >
      {episodios.map((ep, idx) => {
        const visto = !!episodiosAssistidos[ep.id]
        const isProximo = idx === proximoIdx
        const salvando = salvandoEp === ep.id
        const estreiaFutura = episodioAindaNaoEstreou(ep)
        const previsaoEstreia = estreiaFutura ? textoEstreia(ep) : null

        const thumb = tmdbImage(ep.still_path, 'w342')
        const sNum = ep.season_number < 10 ? `S0${ep.season_number}` : `S${ep.season_number}`
        const eNum = ep.episode_number < 10 ? `E0${ep.episode_number}` : `E${ep.episode_number}`

        return (
          <div
            key={ep.id}
            ref={idx === focoIdx ? proximoRef : undefined}
            className={[
              'relative shrink-0 transition-all duration-300',
              isProximo
                ? 'scale-[1.06]'
                : 'opacity-85 hover:opacity-100 hover:scale-[1.01]',
            ].join(' ')}
            style={{ width: 200 }}
          >
            {/* Thumbnail */}
            <button
              onClick={() =>
                navigate(
                  `/series/${serieId}/temporadas/${ep.season_number}/episodios/${ep.episode_number}`
                )
              }
              className="relative block w-full overflow-hidden rounded-[22px]"
              style={{ height: 120 }}
              aria-label={`Ver detalhes de ${ep.name}`}
            >
              {thumb ? (
                <>
                  <img
                    src={thumb}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className={[
                      'h-full w-full object-cover transition-all duration-300',
                      visto ? 'brightness-50 saturate-50' : '',
                    ].join(' ')}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                  <Play size={18} className="text-zinc-400" />
                </div>
              )}

              {/* Badge Próximo */}
              {estreiaFutura && previsaoEstreia ? (
                <div className="absolute top-2 left-2">
                  <span className="rounded-full border border-amber-200/20 bg-amber-400/20 px-2.5 py-1 text-[9px] font-semibold text-amber-100 backdrop-blur-xl">
                    Estreia: {previsaoEstreia}
                  </span>
                </div>
              ) : isProximo && !visto && (
                <div className="absolute top-2 left-2">
                  <span
                    className="
                      rounded-full
                      border
                      border-white/10
                      bg-white/15
                      px-2.5
                      py-1
                      text-[9px]
                      font-medium
                      text-white
                      backdrop-blur-xl
                    "
                  >
                    Próximo
                  </span>
                </div>
              )}
            </button>

            {/* rodape com a temporada e ep */}
            <div className="mt-2 flex items-center justify-between px-1">
              <span
                className={[
                  'text-xs font-medium tracking-wide',
                  visto ? 'text-zinc-500' : 'text-zinc-200',
                ].join(' ')}
              >
                {sNum} · {eNum}
              </span>

              <button
                onClick={() => onToggle(ep)}
                disabled={!!salvando || estreiaFutura}
                aria-label={visto ? 'Desmarcar como visto' : 'Marcar como visto'}
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200',
                  visto
                    ? 'bg-green-500 text-black'
                    : 'bg-white/10 backdrop-blur-md hover:bg-white/20',
                  salvando || estreiaFutura ? 'cursor-not-allowed opacity-40' : '',
                ].join(' ')}
              >
                {salvando ? (
                  <Loader2
                    size={12}
                    className="animate-spin text-white"
                    aria-hidden="true"
                  />
                ) : visto ? (
                  <Check
                    size={12}
                    className="text-black"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            </div>
            {previsaoEstreia && (
              <p className="mt-1 px-1 text-[11px] font-medium text-amber-300">
                Estreia: {previsaoEstreia}
              </p>
            )}
          </div>
        )
      })}
    </div>
  </div>
)
}

function ActionBtn({ icon, label, ativo = false, onClick, corAtivo }: {
  icon: React.ReactNode
  label: string
  ativo?: boolean
  onClick?: () => void
  corAtivo?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3.5 transition-colors active:scale-95"
      style={{ color: ativo && corAtivo ? corAtivo : '#9898ac' }}
    >
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
