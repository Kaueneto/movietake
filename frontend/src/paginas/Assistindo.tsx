import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Tv2, Check, ChevronRight, ChevronDown, CalendarDays } from 'lucide-react'
import { useContinuarAssistindo, type SerieEmProgresso } from '../hooks/useContinuarAssistindo'
import { tmdbImage } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

type Aba = 'assistindo' | 'estreias'

function formatarProximaEstreia(data: string | null) {
  if (!data) return 'Data de estreia indisponível'

  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12)
  const estreia = new Date(`${data}T12:00:00`)
  const dias = Math.round((estreia.getTime() - inicioHoje.getTime()) / 86_400_000)

  if (dias <= 0) return 'Estreia hoje'
  if (dias === 1) return 'Estreia amanhã'
  if (dias <= 15) return `Estreia em ${dias} dias`

  return `Estreia em ${estreia.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

export function Assistindo() {
  const { emAndamento, naoIniciadas, proximasEstreias, loading } = useContinuarAssistindo()
  const { profileId } = useAuth()
  const [aba, setAba] = useState<Aba>('assistindo')

  const temAlguma = emAndamento.length > 0 || naoIniciadas.length > 0

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f13]">
        <Loader2 size={28} className="animate-spin text-[#6366f1]" aria-label="Carregando" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <div
        className="sticky top-0 z-30 bg-[#0f0f13] px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
      >
        <div className="flex border-b border-[#2a2a38]">
          <button
            onClick={() => setAba('assistindo')}
            className={['flex-1 pb-3 text-sm font-semibold transition-colors', aba === 'assistindo' ? 'border-b-2 border-[#6366f1] text-[#f1f1f3]' : 'text-[#5a5a72]'].join(' ')}
          >
            Continuar Assistindo
          </button>
          <button
            onClick={() => setAba('estreias')}
            className={['flex-1 pb-3 text-sm font-semibold transition-colors', aba === 'estreias' ? 'border-b-2 border-[#6366f1] text-[#f1f1f3]' : 'text-[#5a5a72]'].join(' ')}
          >
            Estreia em Breve
          </button>
        </div>
      </div>

      <div className="px-4 pb-28 pt-4">
        {aba === 'assistindo' && (
          <>
            {!temAlguma ? (
              <EstadoVazio mensagem="Nenhuma série sendo acompanhada" detalhe='Abra uma série e aperte "Seguir" para começar.' />
            ) : (
              <div className="space-y-3">

                {/* Em andamento — recolhível */}
                {emAndamento.length > 0 && (
                  <SecaoRecolhivel
                    label="Em andamento"
                    count={emAndamento.length}
                    cor="text-[#6366f1] bg-[#6366f1]/10 uppercase"
                    defaultAberta
                  >
                    {emAndamento.map((serie) => (
                      <CardSerie key={serie.tmdbId} serie={serie} profileId={profileId} />
                    ))}
                  </SecaoRecolhivel>
                )}

                {/* Não iniciadas — recolhível */}
                {naoIniciadas.length > 0 && (
                  <SecaoRecolhivel
                    label="Não iniciadas"
                    count={naoIniciadas.length}
                    cor="text-[#9898ac] bg-[#2a2a38] uppercase"
                    defaultAberta
                  >
                    {naoIniciadas.map((serie) => (
                      <CardSerie key={serie.tmdbId} serie={serie} profileId={profileId} />
                    ))}
                  </SecaoRecolhivel>
                )}

              </div>
            )}
          </>
        )}

        {aba === 'estreias' && (
          proximasEstreias.length === 0 ? (
            <EstadoVazio mensagem="Nenhuma estreia em breve" detalhe="Quando o próximo episódio de uma série acompanhada tiver data de estreia, ele aparecerá aqui." />
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase text-amber-300">
                  Próximas estreias
                  <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-bold leading-none">{proximasEstreias.length}</span>
                </span>
              </div>
              {proximasEstreias.map((serie) => (
                <CardEstreia key={serie.tmdbId} serie={serie} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function CardEstreia({ serie }: { serie: SerieEmProgresso }) {
  const navigate = useNavigate()
  const poster = tmdbImage(serie.poster_path, 'w342')
  const episodio = serie.proximo!
  const dataEstreia = formatarProximaEstreia(episodio.air_date)
  const episodioLabel = `T${String(episodio.season_number).padStart(2, '0')} · E${String(episodio.episode_number).padStart(2, '0')}`

  return (
    <button
      onClick={() => navigate(`/series/${serie.tmdbId}/temporadas/${episodio.season_number}/episodios/${episodio.episode_number}`)}
      className="flex w-full items-center gap-3 rounded-2xl bg-[#1c1c24] p-2 pr-3 text-left transition-colors active:bg-[#252532]"
      aria-label={`Ver detalhes da estreia de ${serie.nome}`}
    >
      <div className="h-[72px] w-[52px] shrink-0 overflow-hidden rounded-xl bg-[#16161c]">
        {poster ? (
          <img src={poster} alt={serie.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Tv2 size={18} className="text-[#3a3a4a]" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-[#9898ac]">{serie.nome.toUpperCase()}</p>
        <p className="mt-1 text-base font-bold text-[#f1f1f3]">{episodioLabel}</p>
        <p className="mt-0.5 truncate text-xs text-[#9898ac]">{episodio.nome || 'Próximo episódio'}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-300">
          <CalendarDays size={13} aria-hidden="true" />
          {dataEstreia}
        </p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-[#5a5a72]" aria-hidden="true" />
    </button>
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
      {aberta && <div className="space-y-3">{children}</div>}
    </div>
  )
}

function CardSerie({ serie, profileId }: { serie: SerieEmProgresso; profileId: number | null }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const poster = tmdbImage(serie.poster_path, 'w342')
  const [confirmado, setConfirmado] = useState(false)

  const labelProximo = serie.proximo
    ? `S${String(serie.proximo.season_number).padStart(2, '0')} | E${String(serie.proximo.episode_number).padStart(2, '0')}`
    : null

  function irParaEpisodio() {
    if (serie.proximo) {
      navigate(`/series/${serie.tmdbId}/temporadas/${serie.proximo.season_number}/episodios/${serie.proximo.episode_number}`)
    } else {
      navigate(`/series/${serie.tmdbId}`)
    }
  }

  async function marcarEAssistir() {
    if (!profileId || !serie.proximo || confirmado) return
    setConfirmado(true)

    // Grava em background — não bloqueia a navegação
    import('../lib/api').then(({ api }) =>
      api.get<{ id: number }>(
        `/series/${serie.tmdbId}/temporadas/${serie.proximo!.season_number}/episodios/${serie.proximo!.episode_number}`
      ).then(({ data: detalhes }) =>
        Promise.all([
          supabase.from('series_episode_history').upsert(
            {
              user_id: profileId,
              tmdb_id: serie.tmdbId,
              season_number: serie.proximo!.season_number,
              episode_number: serie.proximo!.episode_number,
              episode_tmdb_id: detalhes.id,
            },
            { onConflict: 'user_id,episode_tmdb_id' }
          ),
          supabase.from('series_progress').upsert(
            { user_id: profileId, tmdb_id: serie.tmdbId, status: 'watching' },
            { onConflict: 'user_id,tmdb_id' }
          ),
        ])
      )
    )
      .then(() => queryClient.invalidateQueries({ queryKey: ['continuarAssistindo', profileId] }))

    await new Promise((res) => setTimeout(res, 500))
    navigate(`/series/${serie.tmdbId}/temporadas/${serie.proximo.season_number}/episodios/${serie.proximo.episode_number}`)
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#1c1c24] p-2 pr-3">
      {/* Poster */}
      <button
        onClick={() => navigate(`/series/${serie.tmdbId}`)}
        aria-label={`Ver série ${serie.nome}`}
        className="shrink-0"
      >
        <div className="h-[72px] w-[52px] overflow-hidden rounded-xl bg-[#16161c]">
          {poster ? (
            <img src={poster} alt={serie.nome} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center ">
              <Tv2 size={18} className="text-[#3a3a4a] " aria-hidden="true" />
            </div>
          )}
        </div>
      </button>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        {/* Nome da série — vai para detalhes */}
        <button
          onClick={() => navigate(`/series/${serie.tmdbId}`)}
          className="mb-1 flex items-center gap-1 bg-[#3a3a469a] border border-gray-700 hover:scale-105 text-left text-sm hover:text-[#f1f1f3] rounded-lg px-2 py-1 transform transition-all duration-200"
          aria-label={`Ver detalhes de ${serie.nome}`}
        >
          <span className="text-xs font-semibold text-[#9898ac] bg-gray-700/1">{serie.nome.toUpperCase()}</span>
          <ChevronRight size={12} className="text-[#5a5a72]" aria-hidden="true" />
        </button>

        {/* Episódio — vai direto para o episódio */}
        <button
          onClick={irParaEpisodio}
          className="w-full text-left"
          aria-label={serie.concluida ? `Ver ${serie.nome}` : `Assistir próximo episódio de ${serie.nome}`}
        >
          {serie.concluida ? (
            <p className="text-sm font-bold text-green-400">Concluída</p>
          ) : (
            <>
              <p className="text-xl font-bold leading-tight text-[#f1f1f3]">
                {labelProximo}
              </p>
              <p className="mt-0.5 truncate text-xs text-[#9898ac]">
                {serie.proximo?.nome || 'Próximo episódio'}
              </p>
            </>
          )}
        </button>
      </div>

      {/* Botão check — só para séries não concluídas */}
      {!serie.concluida && (
        <button
          onClick={marcarEAssistir}
          disabled={confirmado}
          aria-label="Marcar como assistido e avaliar"
          className={[
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-md transition-all duration-300 active:scale-90',
            confirmado
              ? 'scale-110 bg-green-500 text-white'
              : 'bg-[#f1f1f3] text-[#0f0f13]',
          ].join(' ')}
        >
          <Check size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function EstadoVazio({ mensagem, detalhe }: { mensagem: string; detalhe?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 pt-20 text-center">
      <Tv2 size={44} className="text-[#2a2a38]" aria-hidden="true" />
      <p className="text-sm font-medium text-[#5a5a72]">{mensagem}</p>
      {detalhe && <p className="text-xs text-[#3a3a4a]">{detalhe}</p>}
    </div>
  )
}
