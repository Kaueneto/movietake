import axios from 'axios'
import { env } from '../config/env'

/** cliente axios pré-configurado para o TMDB usando o Bearer token (v4) */
const tmdbClient = axios.create({
  baseURL: env.tmdb.baseUrl,
  headers: {
    Authorization: `Bearer ${env.tmdb.readToken}`,
    Accept: 'application/json',
  },
  params: {
    language: 'pt-BR',
  },
})

export type MediaType = 'movie' | 'tv' | 'all'
export type TimeWindow = 'day' | 'week'

//busca multi (filmes + séries)
export async function searchMulti(query: string, page = 1) {
  const { data } = await tmdbClient.get('/search/multi', {
    params: { query, page, include_adult: false },
  })
  return data
}

/** busca só filmes */
export async function searchMovies(query: string, page = 1) {
  const { data } = await tmdbClient.get('/search/movie', {
    params: { query, page, include_adult: false },
  })
  return data
}

/** busca só séries */
export async function searchSeries(query: string, page = 1) {
  const { data } = await tmdbClient.get('/search/tv', {
    params: { query, page, include_adult: false },
  })
  return data
}

/** trending */
export async function getTrending(mediaType: MediaType = 'all', timeWindow: TimeWindow = 'week') {
  const { data } = await tmdbClient.get(`/trending/${mediaType}/${timeWindow}`)
  return data
}

/** detalhes de um filme */
export async function getMovieDetails(id: number) {
  const { data } = await tmdbClient.get(`/movie/${id}`, {
    params: { append_to_response: 'credits,videos' },
  })
  return data
}

/** setalhes de uma série */
export async function getSerieDetails(id: number) {
  const { data } = await tmdbClient.get(`/tv/${id}`, {
    params: { append_to_response: 'credits,videos' },
  })
  return data
}

/** busca pessoas (atores, diretores, etc.) */
export async function searchPeople(query: string, page = 1) {
  const { data } = await tmdbClient.get('/search/person', {
    params: { query, page, include_adult: false },
  })
  return data
}
