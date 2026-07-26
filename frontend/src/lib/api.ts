import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})


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
  genre_ids: number[]
  media_type?: 'movie'
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

export type FiltroTipo = 'all' | 'movie' | 'tv' | 'person'

export const pesquisar = (q: string, tipo: FiltroTipo = 'all', pagina = 1) =>
  api.get<TMDBPaginatedResponse<AnyMediaItem>>('/pesquisa', {
    params: { q, tipo, pagina },
  })

export const getTrending = (tipo: Omit<FiltroTipo, 'person'> = 'all', janela: 'day' | 'week' = 'week') =>
  api.get<TMDBPaginatedResponse<TMDBMediaItem>>('/pesquisa/trending', {
    params: { tipo, janela },
  })
