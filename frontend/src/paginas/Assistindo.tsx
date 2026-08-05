import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Tv2, Check, ChevronRight } from 'lucide-react'
import { useContinuarAssistindo, type SerieEmProgresso } from '../hooks/useContinuarAssistindo'
import { tmdbImage } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

type Aba = 'assistindo' | 'estreias'

export function Assistindo() {
  const { emAndamento, concluidas, loading } = useContinuarAssistindo()
  const { profileId } = useAuth()
  const [aba, setAba] = useState<Aba>('assistindo')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f13]">
        <Loader2 size={28} className="animate-spin text-[#6366f1]" aria-label="Carregando" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* Header fixo com abas */}
      <div className="sticky top-0 z-30 bg-[#0f0f13] px-4 pt-5">
        <h1 className="mb-4 text-xl font-bold text-[#f1f1f3]">Assistindo</h1>
        <div className="flex border-b border-[#2a2a38]">
          <button
            onClick={() => setAba('assistindo')}
            className={[
              'flex-1 pb-3 text-sm font-semibold transition-colors',
              aba === 'assistindo'
                ? 'border-b-2 border-[#6366f1] text-[#f1f1f3]'
                : 'text-[#5a5a72]',
            ].join(' ')}
          >
            Continuar Assistindo
          </button>
          <button
            onClick={() => setAba('estreias')}
            className={[
              'flex-1 pb-3 text-sm font-semibold transition-colors',
              aba === 'estreias'
                ? 'border-b-2 border-[#6366f1] text-[#f1f1f3]'
                : 'text-[#5a5a72]',
            ].join(' ')}
          >
            Estreia em Breve
          </button>
        </div>
      </div>

      <div className="px-4 pb-28 pt-4">
        {aba === 'assistindo' && (
          <>
            {emAndamento.length === 0 && concluidas.length === 0 ? (
              <EstadoVazio mensagem="Nenhuma série em andamento" />
            ) : (
              <div className="space-y-3">
                {emAndamento.map((serie) => (
                  <CardSerie key={serie.tmdbId} serie={serie} profileId={profileId} />
                ))}

                {concluidas.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 pt-2">
                      <div className="h-px flex-1 bg-[#2a2a38]" />
                      <span className="text-[11px] text-[#5a5a72]">Concluídas</span>
                      <div className="h-px flex-1 bg-[#2a2a38]" />
                    </div>
                    {concluidas.map((serie) => (
                      <CardSerie key={serie.tmdbId} serie={serie} profileId={profileId} />
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {aba === 'estreias' && (
          <EstadoVazio
            mensagem="Em breve"
            detalhe="Os próximos episódios das suas séries aparecerão aqui."
          />
        )}
      </div>
    </div>
  )
}

function CardSerie({ serie, profileId }: { serie: SerieEmProgresso; profileId: number | null }) {
  const navigate = useNavigate()
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

    await new Promise((res) => setTimeout(res, 500))

    navigate(
      `/series/${serie.tmdbId}/temporadas/${serie.proximo.season_number}/episodios/${serie.proximo.episode_number}`
    )
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
            <div className="flex h-full w-full items-center justify-center">
              <Tv2 size={18} className="text-[#3a3a4a]" aria-hidden="true" />
            </div>
          )}
        </div>
      </button>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        {/* Nome da série — vai para detalhes da série */}
        <button
          onClick={() => navigate(`/series/${serie.tmdbId}`)}
          className="mb-1 flex items-center gap-1"
          aria-label={`Ver detalhes de ${serie.nome}`}
        >
          <span className="text-xs font-semibold text-[#9898ac]">{serie.nome.toUpperCase()}</span>
          <ChevronRight size={12} className="text-[#5a5a72]" aria-hidden="true" />
        </button>

        {/* Episódio — vai para o episódio */}
        <button
          onClick={irParaEpisodio}
          className="w-full text-left"
          aria-label={`Assistir próximo episódio de ${serie.nome}`}
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

      {/* Botão check circular */}
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
