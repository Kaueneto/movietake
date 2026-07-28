import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import { env } from '../config/env'

const tmdbClient = axios.create({
  baseURL: env.tmdb.baseUrl,
  timeout: 15000, // 15s — mais tolerante que o padrão
  headers: {
    Authorization: `Bearer ${env.tmdb.readToken}`,
    Accept: 'application/json',
  },
  params: {
    language: 'pt-BR',
  },
})

// ===== Retry automático =====
// Erros de rede (ECONNRESET, ETIMEDOUT, 429, 503) fazem até 3 tentativas
// com backoff exponencial: 500ms → 1000ms → 2000ms

const RETRY_ERRORS = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EPIPE', 'ENOTFOUND'])
const MAX_RETRIES = 3

async function withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const axiosErr = err as AxiosError
    const code = axiosErr.code ?? ''
    const status = axiosErr.response?.status ?? 0

    const isRetryable =
      RETRY_ERRORS.has(code) ||
      status === 429 ||
      status === 503 ||
      status === 502

    if (isRetryable && attempt < MAX_RETRIES) {
      const delay = 500 * Math.pow(2, attempt - 1) // 500, 1000, 2000
      console.warn(`[TMDB] tentativa ${attempt} falhou (${code || status}), retry em ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
      return withRetry(fn, attempt + 1)
    }

    throw err
  }
}

function get(url: string, config?: AxiosRequestConfig) {
  return withRetry(() => tmdbClient.get(url, config))
}

//tipos

export type MediaType = 'movie' | 'tv' | 'all'
export type TimeWindow = 'day' | 'week'

// endoints

export async function searchMulti(query: string, page = 1) {
  const { data } = await get('/search/multi', {
    params: { query, page, include_adult: false },
  })
  return data
}

export async function searchMovies(query: string, page = 1) {
  const { data } = await get('/search/movie', {
    params: { query, page, include_adult: false },
  })
  return data
}

export async function searchSeries(query: string, page = 1) {
  const { data } = await get('/search/tv', {
    params: { query, page, include_adult: false },
  })
  return data
}

export async function getTrending(mediaType: MediaType = 'all', timeWindow: TimeWindow = 'week') {
  const { data } = await get(`/trending/${mediaType}/${timeWindow}`)
  return data
}

export async function getMovieDetails(id: number) {
  const { data } = await get(`/movie/${id}`, {
    params: { append_to_response: 'credits,videos,watch/providers' },
  })
  return data
}

export async function getSerieDetails(id: number) {
  const { data } = await get(`/tv/${id}`, {
    params: { append_to_response: 'credits,videos,watch/providers' },
  })
  return data
}

export async function getSerieSeason(serieId: number, seasonNumber: number) {
  const { data } = await get(`/tv/${serieId}/season/${seasonNumber}`)
  return data
}

export async function getMovieProviders(id: number) {
  const { data } = await get(`/movie/${id}/watch/providers`)
  return data
}

export async function searchPeople(query: string, page = 1) {
  const { data } = await get('/search/person', {
    params: { query, page, include_adult: false },
  })
  return data
}
