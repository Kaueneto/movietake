import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Star, Clock, Calendar,
  Loader2, AlertCircle, Heart, Eye,
} from 'lucide-react'
import {
  getDetalhesEpisodio,
  tmdbImage,
  type TMDBEpisodeDetails,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const SENTIMENTOS = [
  { emoji: '🥹', label: 'Emocionado' },
  { emoji: '😂', label: 'Engraçado' },
  { emoji: '😭', label: 'Triste' },
  { emoji: '🤯', label: 'Explodiu minha mente' },
  { emoji: '😍', label: 'Apaixonado' },
  { emoji: '😱', label: 'Tenso' },
  { emoji: '😴', label: 'Entediante' },
  { emoji: '😡', label: 'Raiva' },
]

const ASSISTIU_COM = [
  { id: 'alone',   label: 'Sozinho' },
  { id: 'friends', label: 'Amigos' },
  { id: 'family',  label: 'Família' },
  { id: 'partner', label: 'Namorado(a)' },
  { id: 'cinema',  label: 'Cinema' },
  { id: 'other',   label: 'Outro' },
]

export function DetalhesEpisodio() {
  const { serieId, temporada, episodio } = useParams<{
    serieId: string
    temporada: string
    episodio: string
  }>()
  const navigate = useNavigate()
  const { profileId } = useAuth()

  const [ep, setEp] = useState<TMDBEpisodeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [assistido, setAssistido] = useState(false)
  const [avaliacao, setAvaliacao] = useState(0)
  const [sentimento, setSentimento] = useState<string | null>(null)
  const [assistiuCom, setAssistiuCom] = useState<string | null>(null)
  const [favorito, setFavorito] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [personagemFav, setPersonagemFav] = useState<number | null>(null)

  useEffect(() => {
    if (!serieId || !temporada || !episodio) return
    setLoading(true)
    setError(null)
    getDetalhesEpisodio(Number(serieId), Number(temporada), Number(episodio))
      .then((res) => setEp(res.data))
      .catch(() => setError('Não foi possível carregar o episódio.'))
      .finally(() => setLoading(false))
  }, [serieId, temporada, episodio])

  useEffect(() => {
    if (!profileId || !ep?.id) return
    supabase
      .from('series_episode_history')
      .select('id')
      .eq('user_id', profileId)
      .eq('episode_tmdb_id', ep.id)
      .maybeSingle()
      .then(({ data }) => setAssistido(!!data))
  }, [profileId, ep?.id])

  const episodioTmdbId = ep?.id ?? null

  async function toggleAssistido() {
    if (!profileId || !serieId || !temporada || !episodio || !episodioTmdbId) return
    setSalvando(true)
    try {
      if (assistido) {
        await supabase
          .from('series_episode_history')
          .delete()
          .eq('user_id', profileId)
          .eq('episode_tmdb_id', episodioTmdbId)
        setAssistido(false)
      } else {
        await supabase.from('series_episode_history').upsert(
          {
            user_id: profileId,
            tmdb_id: Number(serieId),
            season_number: Number(temporada),
            episode_number: Number(episodio),
            episode_tmdb_id: episodioTmdbId,
          },
          { onConflict: 'user_id,episode_tmdb_id' }
        )
        setAssistido(true)
      }
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f13]">
      <Loader2 size={28} className="animate-spin text-[#6366f1]" aria-label="Carregando" />
    </div>
  )

  if (error || !ep) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f0f13] px-6 text-center">
      <AlertCircle size={36} className="text-red-400" aria-hidden="true" />
      <p className="text-sm text-[#9898ac]">{error ?? 'Episódio não encontrado.'}</p>
      <button onClick={() => navigate(-1)} className="rounded-xl bg-[#6366f1] px-6 py-2.5 text-sm font-medium text-white">
        Voltar
      </button>
    </div>
  )

  const still = tmdbImage(ep.still_path, 'w780')
  const elenco = ep.credits?.cast?.slice(0, 15) ?? []
  const diretor = ep.credits?.crew?.find((c) => c.job === 'Director')
  const nota = ep.vote_average ? ep.vote_average.toFixed(1) : null

  return (
    <div className="min-h-screen bg-[#0f0f13] overflow-x-hidden pb-28">

      {/* Imagem do episódio */}
      <div className="relative w-full aspect-video overflow-hidden bg-[#16161c]">
        {still
          ? <img src={still} alt="" aria-hidden="true" className="h-full w-full object-cover object-top" />
          : <div className="h-full w-full bg-[#16161c]" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-transparent to-transparent" />
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="absolute left-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Título e metadados */}
      <div className="px-4 pt-4 pb-2">
        <p className="mb-1 text-xs font-semibold text-[#6366f1]">
          S{String(ep.season_number).padStart(2, '0')} · E{String(ep.episode_number).padStart(2, '0')}
        </p>
        <h1 className="text-xl font-semibold leading-tight text-[#f1f1f3]">{ep.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {diretor && <span className="text-xs text-[#9898ac]">Dir. {diretor.name}</span>}
          {ep.air_date && (
            <span className="flex items-center gap-1 text-xs text-[#9898ac]">
              <Calendar size={11} aria-hidden="true" />
              {new Date(ep.air_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
          {ep.runtime && (
            <span className="flex items-center gap-1 text-xs text-[#9898ac]">
              <Clock size={11} aria-hidden="true" />
              {ep.runtime} min
            </span>
          )}
          {nota && (
            <span className="flex items-center gap-1 text-xs font-semibold text-white">
              <Star size={11} className="fill-[#6366f1] text-[#6366f1]" aria-hidden="true" />
              {nota}
            </span>
          )}
        </div>
      </div>

      {/* Botões de ação */}
      <div className="grid grid-cols-3 gap-2 px-4 pt-2">
        <BotaoAcao
          icon={salvando ? <Loader2 size={25} className="animate-spin" /> : <Eye size={25} />}
          label={assistido ? 'Assistido' : 'Já assisti'}
          ativo={assistido}
          corAtivo="#f97316"
          onClick={toggleAssistido}
        />
        <BotaoAcao
          icon={<Star size={25} className={avaliacao > 0 ? 'fill-current' : ''} />}
          label="Avaliar"
          ativo={avaliacao > 0}
          corAtivo="#16a34a"
        />
        <BotaoAcao
          icon={<Heart size={25} className={favorito ? 'fill-current' : ''} />}
          label="Favorito"
          ativo={favorito}
          corAtivo="#ef4444"
          onClick={() => setFavorito((v) => !v)}
        />
      </div>

      {/* Conteúdo */}
      <div className="mt-5 space-y-6 px-4">

        {/* Sinopse */}
        {ep.overview && (
          <Secao title="Sinopse">
            <p className="text-sm leading-relaxed text-[#9898ac]">{ep.overview}</p>
          </Secao>
        )}

        {/* Avaliação com estrelas */}
        <div className="rounded-2xl border border-[#2a2a38] bg-[#1c1c24] px-4 py-4">
          <p className="mb-2 text-xs font-semibold tracking-wider text-[#5a5a72]">Sua avaliação</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setAvaliacao(n === avaliacao ? 0 : n)} aria-label={`${n} estrela${n > 1 ? 's' : ''}`}>
                <Star
                  size={28}
                  className={n <= avaliacao ? 'fill-[#16a34a] text-[#16a34a]' : 'text-[#2a2a38]'}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Como se sentiu */}
        <Secao title="Como você se sentiu">
          <div className="grid grid-cols-4 gap-2">
            {SENTIMENTOS.map((s) => (
              <button
                key={s.label}
                onClick={() => setSentimento(sentimento === s.label ? null : s.label)}
                aria-pressed={sentimento === s.label}
                className={[
                  'flex flex-col items-center gap-1.5 rounded-xl border py-3 transition-colors',
                  sentimento === s.label
                    ? 'border-[#6366f1]/50 bg-[#6366f1]/10'
                    : 'border-[#2a2a38] bg-[#1c1c24]',
                ].join(' ')}
              >
                <span className="text-xl leading-none" aria-hidden="true">{s.emoji}</span>
                <span className="text-center text-[9px] leading-tight text-[#9898ac] line-clamp-2 px-1">{s.label}</span>
              </button>
            ))}
          </div>
        </Secao>

        {/* Assistiu com */}
        <Secao title="Assistiu com">
          <div className="flex flex-wrap gap-2">
            {ASSISTIU_COM.map((op) => (
              <button
                key={op.id}
                onClick={() => setAssistiuCom(assistiuCom === op.id ? null : op.id)}
                aria-pressed={assistiuCom === op.id}
                className={[
                  'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  assistiuCom === op.id
                    ? 'border-[#6366f1] bg-[#6366f1]/15 text-[#6366f1]'
                    : 'border-[#2a2a38] bg-[#1c1c24] text-[#9898ac]',
                ].join(' ')}
              >
                {op.label}
              </button>
            ))}
          </div>
        </Secao>

        {/* Personagem favorito — inclui o elenco */}
        {elenco.length > 0 && (
          <Secao title="Personagem favorito">
            <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {elenco.map((ator) => {
                const foto = tmdbImage(ator.profile_path, 'w185')
                const selecionado = personagemFav === ator.id
                return (
                  <button
                    key={ator.id}
                    onClick={() => setPersonagemFav(selecionado ? null : ator.id)}
                    aria-pressed={selecionado}
                    className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 transition-opacity duration-200"
                    style={{ opacity: personagemFav === null || selecionado ? 1 : 0.3 }}
                  >
                    <div className={[
                      'relative aspect-square w-full overflow-hidden rounded-xl ring-2 transition-all duration-200',
                      selecionado ? 'ring-[#6366f1]' : 'ring-transparent',
                    ].join(' ')}>
                      {foto
                        ? <img src={foto} alt={ator.name} loading="lazy" className="h-full w-full object-cover object-top" />
                        : <div className="flex h-full w-full items-center justify-center bg-[#1c1c24] text-xl font-bold text-[#5a5a72]">{ator.name[0]}</div>
                      }
                    </div>
                    <p className="text-center text-[10px] font-semibold leading-tight text-[#f1f1f3] line-clamp-2">{ator.character}</p>
                    <p className="text-center text-[9px] leading-tight text-[#5a5a72] line-clamp-1">{ator.name}</p>
                  </button>
                )
              })}
            </div>
          </Secao>
        )}

      </div>
    </div>
  )
}

function BotaoAcao({ icon, label, ativo = false, onClick, corAtivo }: {
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

function Secao({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-[#f1f1f3]">{title}</h2>
      {children}
    </div>
  )
}
