import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10000,
})

// tipos base

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface TMDBCrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
}

export interface TMDBProvider {
  logo_path: string
  provider_id: number
  provider_name: string
  display_priority: number
}

export interface TMDBWatchProviders {
  link: string
  flatrate?: TMDBProvider[]  // streaming
  rent?: TMDBProvider[]
  buy?: TMDBProvider[]
}

export interface TMDBMovie {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  popularity: number
  runtime: number | null
  genres: TMDBGenre[]
  genre_ids: number[]
  media_type?: 'movie'
}

export interface TMDBMovieDetails extends TMDBMovie {
  providers_br: TMDBWatchProviders | null
  credits: {
    cast: TMDBCastMember[]
    crew: TMDBCrewMember[]
  }
}

export interface TMDBSerie {
  id: number
  name: string
  original_name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  popularity: number
  genres: TMDBGenre[]
  genre_ids: number[]
  media_type?: 'tv'
}

export interface TMDBPerson {
  id: number
  name: string
  profile_path: string | null
  known_for_department: string
  popularity: number
  media_type?: 'person'
  known_for: Array<TMDBMovie | TMDBSerie>
}

export type TMDBMediaItem = (TMDBMovie | TMDBSerie) & { media_type: 'movie' | 'tv' }
export type AnyMediaItem = TMDBMediaItem | TMDBPerson

export interface TMDBPaginatedResponse<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

// helpers

export const isMovie = (item: TMDBMovie | TMDBSerie): item is TMDBMovie =>
  'title' in item

export const isPerson = (item: AnyMediaItem): item is TMDBPerson =>
  item.media_type === 'person'

export const getTitle = (item: TMDBMovie | TMDBSerie) =>
  isMovie(item) ? item.title : (item as TMDBSerie).name

export const getReleaseYear = (item: TMDBMovie | TMDBSerie) => {
  const date = isMovie(item)
    ? (item as TMDBMovie).release_date
    : (item as TMDBSerie).first_air_date
  return date ? new Date(date).getFullYear() : null
}

export const tmdbImage = (
  path: string | null,
  size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342',
) => {
  if (!path) return null
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export const formatRuntime = (minutes: number | null) => {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}


export type FiltroTipo = 'all' | 'movie' | 'tv' | 'person'

export const pesquisar = (q: string, tipo: FiltroTipo = 'all', pagina = 1) =>
  api.get<TMDBPaginatedResponse<AnyMediaItem>>('/pesquisa', {
    params: { q, tipo, pagina },
  })

export const getTrending = (tipo: Omit<FiltroTipo, 'person'> = 'all', janela: 'day' | 'week' = 'week') =>
  api.get<TMDBPaginatedResponse<TMDBMediaItem>>('/pesquisa/trending', {
    params: { tipo, janela },
  })

export const getDetalhesFilme = (id: number) =>
  api.get<TMDBMovieDetails>(`/filmes/${id}`)

export const getProvedoresFilme = (id: number) =>
  api.get<TMDBWatchProviders | null>(`/filmes/${id}/providers`)

// series

export interface TMDBSeasonSummary {
  id: number
  name: string
  season_number: number
  episode_count: number
  poster_path: string | null
  air_date: string | null
  overview: string
}

export interface TMDBEpisode {
  id: number
  name: string
  overview: string
  episode_number: number
  season_number: number
  still_path: string | null
  air_date: string | null
  vote_average: number
  runtime: number | null
}

export interface TMDBSeason {
  id: number
  name: string
  season_number: number
  episodes: TMDBEpisode[]
  poster_path: string | null
  air_date: string | null
  overview: string
}

export interface TMDBSerieDetails extends TMDBSerie {
  providers_br: TMDBWatchProviders | null
  number_of_seasons: number
  number_of_episodes: number
  status: string
  networks: Array<{ id: number; name: string; logo_path: string | null }>
  seasons: TMDBSeasonSummary[]
  created_by: Array<{ id: number; name: string; profile_path: string | null }>
  credits: {
    cast: TMDBCastMember[]
    crew: TMDBCrewMember[]
  }
}

export const getDetalhesSerie = (id: number) =>
  api.get<TMDBSerieDetails>(`/series/${id}`)

export const getTemporadaSerie = (serieId: number, numero: number) =>
  api.get<TMDBSeason>(`/series/${serieId}/temporadas/${numero}`)

// Imagens disponíveis no TMDB 

export interface TMDBImage {
  file_path: string
  width: number
  height: number
  vote_average: number
  iso_639_1: string | null
}

export interface TMDBImagesResponse {
  posters: TMDBImage[]
  backdrops: TMDBImage[]
}

export const getImagensMidia = (tipo: 'movie' | 'tv', id: number) =>
  api.get<TMDBImagesResponse>(`/imagens/${tipo}/${id}`)

// preferencias visuais salvas no Supabase via backend

// Retorno do endpoint GET (preferência de uma obra)
export interface UserMediaPreference {
  custom_poster_path: string | null
  custom_backdrop_path: string | null
}

// Retorno do endpoint batch — inclui identificadores para montar o mapa
export interface UserMediaPreferenceBatch extends UserMediaPreference {
  tmdb_id: number
  media_type: string
}

export const getPreferenciaMidia = (tipo: 'movie' | 'tv', tmdbId: number, authHeader?: string) =>
  api.get<UserMediaPreference>(`/preferencias/midia/${tipo}/${tmdbId}`, {
    headers: authHeader ? { Authorization: authHeader } : {},
  })

export const getPreferenciasBatch = (
  items: Array<{ tmdb_id: number; media_type: string }>,
  authHeader?: string,
) =>
  api.post<UserMediaPreferenceBatch[]>('/preferencias/midia/batch', { items }, {
    headers: authHeader ? { Authorization: authHeader } : {},
  })

export const salvarPreferenciaMidia = (
  body: { tmdb_id: number; media_type: 'movie' | 'tv'; custom_poster_path: string | null; custom_backdrop_path: string | null },
  authHeader?: string,
) =>
  api.post<UserMediaPreference>('/preferencias/midia', body, {
    headers: authHeader ? { Authorization: authHeader } : {},
  })
