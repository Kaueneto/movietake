import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Eye, Star, ListPlus, Bookmark,
  Clock, Calendar, MessageSquare, Loader2, AlertCircle,
  Heart, ChevronRight,
} from 'lucide-react'
import {
  getDetalhesFilme,
  tmdbImage,
  formatRuntime,
  type TMDBMovieDetails,
  type TMDBCastMember,
} from '../lib/api'

const HERO_HEIGHT = 420

// sentimentos
const SENTIMENTOS = [
  { emoji: '🥹', label: 'Emocionado' },
  { emoji: '😂', label: 'Engraçado' },
  { emoji: '😭', label: 'Triste' },
  { emoji: '🤯', label: 'Explodiu minha mente' },
    { emoji: '😱', label: 'Em choque' },
  { emoji: '😍', label: 'Apaixonado' },
  { emoji: '😱', label: 'Tenso' },
  { emoji: '😴', label: 'Entediante' },
    { emoji: '😨', label: 'Medo' },
  { emoji: '😡', label: 'Raiva' },
]

// com quem assistiu
const ASSISTIU_COM = [
  { id: 'sozinho', label: 'Sozinho' },
  { id: 'amigos', label: 'Amigos' },
  { id: 'familia', label: 'Família' },
  { id: 'namorado', label: 'Namorado(a)' },
  { id: 'conjuge', label: 'Cônjuge' },
  { id: 'irmaos', label: 'Irmãos' },

]

// historico mockado pra trocar depois no backend
const HISTORICO_MOCK = [
  { data: '12 jul. 2026', estrelas: 4 },
  { data: '03 jan. 2025', estrelas: 3 },
]

export function DetalhesFilme() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [filme, setFilme] = useState<TMDBMovieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'sobre' | 'detalhes'>('sobre')

  const heroRef = useRef<HTMLDivElement>(null)
  const backdropImgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getDetalhesFilme(Number(id))
      .then((res) => setFilme(res.data))
      .catch(() => setError('Não foi possível carregar os detalhes.'))
      .finally(() => setLoading(false))
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

  if (loading) return <LoadingState />
  if (error || !filme) return <ErrorState message={error} onBack={() => navigate(-1)} />

  const backdrop = tmdbImage(filme.backdrop_path, 'w780')
  const poster = tmdbImage(filme.poster_path, 'w342')
  const ano = filme.release_date ? new Date(filme.release_date).getFullYear() : null
  const duracao = formatRuntime(filme.runtime)
  const nota = filme.vote_average ? filme.vote_average.toFixed(1) : null
  const diretor = filme.credits.crew.find((c) => c.job === 'Director')
  const elenco = filme.credits.cast.slice(0, 15)
  const streaming = filme.providers_br?.flatrate ?? []

  return (
    <div className="min-h-screen bg-[#0f0f13] overflow-x-hidden">

      <div ref={heroRef} className="relative w-full overflow-hidden" style={{ height: HERO_HEIGHT }}>
        <div
          ref={backdropImgRef}
          className="absolute inset-x-0 top-0 w-full"
          style={{ height: HERO_HEIGHT + 160, willChange: 'transform' }}
        >
          {backdrop
            ? <img src={backdrop} alt="" aria-hidden="true" className="h-full w-full object-cover object-center" />
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

        <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 px-4 pb-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight text-white drop-shadow-lg">{filme.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {diretor && <span className="text-xs text-[#9898ac]">Dir. {diretor.name}</span>}
              {ano && (
                <span className="flex items-center gap-1 text-xs text-[#9898ac]">
                  <Calendar size={11} aria-hidden="true" />{ano}
                </span>
              )}
              {duracao && (
                <span className="flex items-center gap-1 text-xs text-[#9898ac]">
                  <Clock size={11} aria-hidden="true" />{duracao}
                </span>
              )}
              {nota && (
                <span className="flex items-center gap-1 text-xs font-semibold text-white">
                  <Star size={11} className="fill-[#6366f1] text-[#6366f1]" aria-hidden="true" />{nota}
                </span>
              )}
            </div>
          </div>
          {poster && (
            <div className="h-36 w-24 shrink-0 overflow-hidden rounded-xl shadow-2xl"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <img src={poster} alt={`Poster de ${filme.title}`} className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-4 gap-2 px-4 pt-4">
        <ActionBtn icon={<Eye size={20} />} label="Já assisti" />
        <ActionBtn icon={<Star size={20} />} label="Avaliar" />
        <ActionBtn icon={<ListPlus size={20} />} label="+ Listas" />
        <ActionBtn icon={<Bookmark size={20} />} label="Quero assistir" />
      </div>

      <div className="sticky top-0 z-30 mt-4 bg-[#0f0f13]">
        <div className="flex border-b border-[#2a2a38]">
          {(['sobre', 'detalhes'] as const).map((aba) => (
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
              {aba === 'sobre' ? 'Sobre o Filme' : 'Seus Detalhes'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0f0f13] pb-28">
        {abaAtiva === 'sobre'
          ? <AbaFilme filme={filme} elenco={elenco} streaming={streaming} />
          : <AbaDetalhesUsuario elenco={elenco} />
        }
      </div>
    </div>
  )
}

// aba "Sobre o Filme"

function AbaFilme({
  filme,
  elenco,
  streaming,
}: {
  filme: TMDBMovieDetails
  elenco: TMDBCastMember[]
  streaming: any[]
}) {
  return (
    <div className="mt-6 space-y-7 px-4">
      {filme.overview && (
        <Section title="Sinopse">
          <p className="text-sm leading-relaxed text-[#9898ac]">{filme.overview}</p>
        </Section>
      )}

      {filme.genres?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filme.genres.map((g) => (
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
            {streaming.map((p) => (
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
// aba "Seus Detalhes"

function AbaDetalhesUsuario({ elenco }: { elenco: TMDBCastMember[] }) {
  const [favorito, setFavorito] = useState(false)
  const [avaliacao, setAvaliacao] = useState(0)
  const [sentimento, setSentimento] = useState<string | null>(null)
  const [assistiuCom, setAssistiuCom] = useState<string | null>(null)
  const [personagemFav, setPersonagemFav] = useState<number | null>(null)

  return (
    <div className="mt-6 space-y-6 px-4">

      <div className="flex items-center justify-between rounded-2xl border border-[#2a2a38] bg-[#1c1c24] px-4 py-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5a5a72]">Sua avaliação</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setAvaliacao(n === avaliacao ? 0 : n)}
                aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={24}
                  className={n <= avaliacao ? 'fill-[#6366f1] text-[#6366f1]' : 'text-[#2a2a38]'}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setFavorito((v) => !v)}
          aria-label={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className={[
            'flex h-12 w-12 items-center justify-center rounded-xl border transition-colors',
            favorito
              ? 'border-red-500/40 bg-red-500/10 text-red-400'
              : 'border-[#2a2a38] text-[#5a5a72] hover:border-red-500/30 hover:text-red-400',
          ].join(' ')}
        >
          <Heart size={22} className={favorito ? 'fill-red-400' : ''} aria-hidden="true" />
        </button>
      </div>

      <Section title="Como você se sentiu">
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
                  : 'border-[#2a2a38] bg-[#1c1c24] hover:border-[#2a2a38]/80',
              ].join(' ')}
            >
              <span className="text-xl leading-none" aria-hidden="true">{s.emoji}</span>
              <span className="text-center text-[9px] leading-tight text-[#9898ac] line-clamp-2 px-1">{s.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Assistiu com">
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
                  : 'border-[#2a2a38] bg-[#1c1c24] text-[#9898ac] hover:border-[#6366f1]/30',
              ].join(' ')}
            >
              {op.label}
            </button>
          ))}
        </div>
      </Section>

      {elenco.length > 0 && (
        <Section title="Personagem favorito">
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {elenco.map((ator) => {
              const foto = tmdbImage(ator.profile_path, 'w185')
              const selecionado = personagemFav === ator.id
              // quando há seleção, não-selecionados ficam em 30% de opacidade
              const opacidade = personagemFav === null || selecionado ? 1 : 0.3

              return (
                <button
                  key={ator.id}
                  onClick={() => setPersonagemFav(selecionado ? null : ator.id)}
                  aria-pressed={selecionado}
                  className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 transition-opacity duration-200"
                  style={{ opacity: opacidade }}
                >
                  {/* foto — relative para o overlay de check funcionar */}
                  <div className={[
                    'relative aspect-square w-full overflow-hidden rounded-xl ring-2 transition-all duration-200',
                    selecionado ? 'ring-[#6366f1]' : 'ring-transparent',
                  ].join(' ')}>
                    {foto
                      ? <img src={foto} alt={ator.name} loading="lazy" className="h-full w-full object-cover object-top" />
                      : <div className="flex h-full w-full items-center justify-center bg-[#1c1c24] text-xl font-bold text-[#5a5a72]">{ator.name[0]}</div>
                    }
                  </div>
                  {/* personagem em cima, ator abaixo */}
                  <p className="text-center text-[10px] font-semibold leading-tight text-[#f1f1f3] line-clamp-2">{ator.character}</p>
                  <p className="text-center text-[9px] leading-tight text-[#5a5a72] line-clamp-1">{ator.name}</p>
                </button>
              )
            })}
          </div>
        </Section>
      )}

     <Section title="Histórico">
        {HISTORICO_MOCK.length > 0 ? (
          <div className="space-y-2">
            {HISTORICO_MOCK.map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-[#2a2a38] bg-[#1c1c24] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Eye size={14} className="text-[#5a5a72]" aria-hidden="true" />
                  <span className="text-sm text-[#9898ac]">{h.data}</span>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={13}
                      className={n <= h.estrelas ? 'fill-[#6366f1] text-[#6366f1]' : 'text-[#2a2a38]'}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#5a5a72]">Você ainda não assistiu este filme.</p>
        )}
      </Section>

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
