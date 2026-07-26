import axios from 'axios'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

const apiKey = import.meta.env.VITE_TMDB_API_KEY

if (!apiKey) {
  console.warn('[TMDB] VITE_TMDB_API_KEY nao definida no .env')
}

export const tmdb = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: apiKey,
    language: 'pt-BR',
  },
})

export const tmdbImage = (path: string | null, size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342') => {
  if (!path) return null
  return `${TMDB_IMAGE_BASE}/${size}${path}`
}

// tipos tmdb

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

export type TMDBMediaItem = (TMDBMovie | TMDBSerie) & { media_type: 'movie' | 'tv' }

export interface TMDBPaginatedResponse<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}


export const isMovie = (item: TMDBMovie | TMDBSerie): item is TMDBMovie =>
  'title' in item

export const getTitle = (item: TMDBMovie | TMDBSerie) =>
  isMovie(item) ? item.title : (item as TMDBSerie).name

export const getReleaseYear = (item: TMDBMovie | TMDBSerie) => {
  const date = isMovie(item)
    ? (item as TMDBMovie).release_date
    : (item as TMDBSerie).first_air_date
  return date ? new Date(date).getFullYear() : null
}

// endpoints

export const searchMulti = (query: string, page = 1) =>
  tmdb.get<TMDBPaginatedResponse<TMDBMediaItem>>('/search/multi', {
    params: { query, page, include_adult: false },
  })

export const searchMovies = (query: string, page = 1) =>
  tmdb.get<TMDBPaginatedResponse<TMDBMovie>>('/search/movie', {
    params: { query, page, include_adult: false },
  })

export const searchSeries = (query: string, page = 1) =>
  tmdb.get<TMDBPaginatedResponse<TMDBSerie>>('/search/tv', {
    params: { query, page, include_adult: false },
  })

export const getTrending = (mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'week') =>
  tmdb.get<TMDBPaginatedResponse<TMDBMediaItem>>(`/trending/${mediaType}/${timeWindow}`)
