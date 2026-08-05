import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

export interface ProximoEpisodio {
  season_number: number
  episode_number: number
  nome: string
  still_path: string | null
}

export interface SerieEmProgresso {
  tmdbId: number
  nome: string
  poster_path: string | null
  backdrop_path: string | null
  totalTemporadas: number
  totalEpisodios: number
  // ult assistido — null se nunca viu nada
  ultimoAssistido: { season_number: number; episode_number: number } | null
  // prox a assistir
  proximo: ProximoEpisodio | null
  // true quando serie está terminada
  concluida: boolean
}

export function useContinuarAssistindo() {
  const { profileId } = useAuth()
  const [series, setSeries] = useState<SerieEmProgresso[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) { setLoading(false); return }
    carregar()
  }, [profileId])

  async function carregar() {
    setLoading(true)
    try {
      // 1. busca em paralelo:
      //    a) series_progress: todas as series que o user sinalizou (plan_to_watch, watching, etc.)
      //    b) series_episode_history: ult ep assistido por serie
      const [{ data: progresso }, { data: historico }] = await Promise.all([
        supabase
          .from('series_progress')
          .select('tmdb_id, status')
          .eq('user_id', profileId)
          .in('status', ['plan_to_watch', 'watching', 'paused']),
        supabase
          .from('series_episode_history')
          .select('tmdb_id, season_number, episode_number, watched_at')
          .eq('user_id', profileId)
          .order('watched_at', { ascending: false }),
      ])

      if (!progresso || progresso.length === 0) {
        setSeries([])
        return
      }

      // 2. mapa do ult ep assistido por serie (primeiro de cada grupo = mais recente)
      const mapaUltimo = new Map<number, { season_number: number; episode_number: number }>()
      for (const row of historico ?? []) {
        if (!mapaUltimo.has(row.tmdb_id)) {
          mapaUltimo.set(row.tmdb_id, {
            season_number: row.season_number,
            episode_number: row.episode_number,
          })
        }
      }

      // 3. para cada serie no progresso, busca detalhes e calcula prox ep
      const resultados = await Promise.all(
        progresso.map(async ({ tmdb_id: tmdbId }): Promise<SerieEmProgresso | null> => {
          try {
            const { data: serie } = await api.get<any>(`/series/${tmdbId}`)
            const temporadas = (serie.seasons ?? []).filter((s: any) => s.season_number > 0)
            const totalTemporadas = serie.number_of_seasons ?? temporadas.length
            const totalEpisodios = serie.number_of_episodes ?? 0
            const ultimoAssistido = mapaUltimo.get(tmdbId) ?? null

            let proximo: ProximoEpisodio | null = null
            let concluida = false

            if (!ultimoAssistido) {
              // neever assistiu nada — prox é S01E01
              const primeiraTemp = temporadas.find((t: any) => t.season_number === 1)
              if (primeiraTemp) {
                proximo = { season_number: 1, episode_number: 1, nome: '', still_path: null }
              }
            } else {
              const tempAtual = temporadas.find(
                (t: any) => t.season_number === ultimoAssistido.season_number
              )
              const proximoNumero = ultimoAssistido.episode_number + 1

              if (tempAtual && proximoNumero <= tempAtual.episode_count) {
                // prox na mesma temporada
                proximo = {
                  season_number: ultimoAssistido.season_number,
                  episode_number: proximoNumero,
                  nome: '',
                  still_path: null,
                }
              } else {
                // tenta próxima temporada
                const proximaTemp = temporadas.find(
                  (t: any) => t.season_number === ultimoAssistido.season_number + 1
                )
                if (proximaTemp) {
                  proximo = {
                    season_number: proximaTemp.season_number,
                    episode_number: 1,
                    nome: '',
                    still_path: null,
                  }
                } else {
                  concluida = true
                }
              }
            }

            // 4. busca nome e still do prox ep
            if (proximo) {
              try {
                const { data: ep } = await api.get<any>(
                  `/series/${tmdbId}/temporadas/${proximo.season_number}/episodios/${proximo.episode_number}`
                )
                proximo.nome = ep.name ?? ''
                proximo.still_path = ep.still_path ?? null
              } catch {
                // silencioso
              }
            }

            return {
              tmdbId,
              nome: serie.name ?? serie.title ?? '—',
              poster_path: serie.poster_path ?? null,
              backdrop_path: serie.backdrop_path ?? null,
              totalTemporadas,
              totalEpisodios,
              ultimoAssistido,
              proximo,
              concluida,
            }
          } catch {
            return null
          }
        })
      )

      setSeries(resultados.filter(Boolean) as SerieEmProgresso[])
    } finally {
      setLoading(false)
    }
  }

  const emAndamento = series.filter((s) => !s.concluida)
  const concluidas = series.filter((s) => s.concluida)

  return { series, emAndamento, concluidas, loading, recarregar: carregar }
}
