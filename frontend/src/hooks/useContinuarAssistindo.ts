import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

export interface ProximoEpisodio {
  season_number: number
  episode_number: number
  nome: string
  still_path: string | null
  air_date: string | null
}

export interface SerieEmProgresso {
  tmdbId: number
  nome: string
  poster_path: string | null
  backdrop_path: string | null
  totalTemporadas: number
  totalEpisodios: number
  episodiosAssistidos: number
  ultimoAssistido: { season_number: number; episode_number: number } | null
  proximo: ProximoEpisodio | null
  concluida: boolean
}

interface EpisodioDaSerie {
  id: number
  season_number: number
  episode_number: number
  name: string
  still_path: string | null
  air_date: string | null
}

async function fetchContinuarAssistindo(profileId: number): Promise<SerieEmProgresso[]> {
  const [{ data: progresso }, { data: historico }] = await Promise.all([
    supabase
      .from('series_progress')
      .select('tmdb_id, status')
      .eq('user_id', profileId)
      .in('status', ['plan_to_watch', 'watching', 'paused']),
    supabase
      .from('series_episode_history')
      .select('tmdb_id, season_number, episode_number, episode_tmdb_id, watched_at')
      .eq('user_id', profileId)
      .order('watched_at', { ascending: false }),
  ])

  if (!progresso || progresso.length === 0) return []

  const mapaUltimo = new Map<number, { season_number: number; episode_number: number }>()
  const mapaEpisodiosAssistidos = new Map<number, Set<number>>()
  for (const row of historico ?? []) {
    if (!mapaUltimo.has(row.tmdb_id)) {
      mapaUltimo.set(row.tmdb_id, { season_number: row.season_number, episode_number: row.episode_number })
    }
    const episodios = mapaEpisodiosAssistidos.get(row.tmdb_id) ?? new Set<number>()
    episodios.add(row.episode_tmdb_id)
    mapaEpisodiosAssistidos.set(row.tmdb_id, episodios)
  }

  const resultados = await Promise.all(
    progresso.map(async ({ tmdb_id: tmdbId }): Promise<SerieEmProgresso | null> => {
      try {
        const { data: serie } = await api.get<any>(`/series/${tmdbId}`)
        const temporadas = (serie.seasons ?? []).filter((s: any) => s.season_number > 0)
        const ultimoAssistido = mapaUltimo.get(tmdbId) ?? null
        const episodiosAssistidosIds = mapaEpisodiosAssistidos.get(tmdbId) ?? new Set<number>()
        const episodiosPorTemporada = await Promise.all(
          temporadas.map(async (temporada: { season_number: number }) => {
            try {
              const { data } = await api.get<{ episodes: EpisodioDaSerie[] }>(
                `/series/${tmdbId}/temporadas/${temporada.season_number}`,
              )
              return data.episodes ?? []
            } catch {
              return [] as EpisodioDaSerie[]
            }
          }),
        )
        const episodiosOrdenados = episodiosPorTemporada
          .flat()
          .sort((a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number)
        const proximoEpisodio = episodiosOrdenados.find((ep) => !episodiosAssistidosIds.has(ep.id))
        const concluida = episodiosOrdenados.length > 0 && !proximoEpisodio
        const proximo = proximoEpisodio
          ? {
              season_number: proximoEpisodio.season_number,
              episode_number: proximoEpisodio.episode_number,
              nome: proximoEpisodio.name ?? '',
              still_path: proximoEpisodio.still_path ?? null,
              air_date: proximoEpisodio.air_date ?? null,
            }
          : null

        return {
          tmdbId,
          nome: serie.name ?? serie.title ?? '—',
          poster_path: serie.poster_path ?? null,
          backdrop_path: serie.backdrop_path ?? null,
          totalTemporadas: serie.number_of_seasons ?? temporadas.length,
          totalEpisodios: serie.number_of_episodes ?? episodiosOrdenados.length,
          episodiosAssistidos: episodiosAssistidosIds.size,
          ultimoAssistido,
          proximo,
          concluida,
        }
      } catch { return null }
    })
  )

  return resultados.filter(Boolean) as SerieEmProgresso[]
}

export function useContinuarAssistindo() {
  const { profileId } = useAuth()
  const queryClient = useQueryClient()

  const { data: series = [], isLoading: loading } = useQuery({
    queryKey: ['continuarAssistindo', profileId],
    queryFn: () => fetchContinuarAssistindo(profileId!),
    enabled: !!profileId,
    // cache por 2 minutos — progresso muda quando o usuário marca episódios
    staleTime: 2 * 60_000,
  })

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ['continuarAssistindo', profileId] })
  }

  const agora = new Date()
  const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
  const estreiaFutura = (serie: SerieEmProgresso) =>
    Boolean(serie.proximo?.air_date && serie.proximo.air_date > hoje)

  // eps cuja data de estreia ainda não chegou não são assistíveis.
  // mateneeemos as séries na lista acompanhada, mas as exibimos exclusivamente
  // na aba de estreias ate que o episódio esteja disponível.
  const emAndamento = series.filter((s) => !s.concluida && s.ultimoAssistido !== null && !estreiaFutura(s))
  const naoIniciadas = series.filter((s) => !s.concluida && s.ultimoAssistido === null && !estreiaFutura(s))
  const proximasEstreias = series
    .filter((s) => s.ultimoAssistido !== null && estreiaFutura(s))
    .sort((a, b) => (a.proximo?.air_date ?? '').localeCompare(b.proximo?.air_date ?? ''))

  return { series, emAndamento, naoIniciadas, proximasEstreias, loading, recarregar: invalidar }
}
