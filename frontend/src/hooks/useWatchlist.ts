import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

export interface WatchlistItem {
  id: number
  tmdb_id: number
  media_type: 'movie' | 'tv'
  title: string
  poster_path: string | null
  year: string | null
  assistido: boolean
}

async function fetchWatchlist(profileId: number): Promise<WatchlistItem[]> {
  const [wlRes, histRes] = await Promise.all([
    supabase.from('watchlist').select('id, tmdb_id, media_type').eq('user_id', profileId).order('created_at', { ascending: false }),
    supabase.from('watch_history').select('tmdb_id, media_type').eq('user_id', profileId),
  ])

  if (!wlRes.data || wlRes.data.length === 0) return []

  const assistidosSet = new Set((histRes.data ?? []).map((h) => `${h.media_type}-${h.tmdb_id}`))
  const lote = wlRes.data.slice(0, 40)

  const detalhes = await Promise.all(
    lote.map(async (row) => {
      try {
        const rota = row.media_type === 'movie' ? `/filmes/${row.tmdb_id}` : `/series/${row.tmdb_id}`
        const { data: info } = await api.get<any>(rota)
        return {
          id: row.id,
          tmdb_id: row.tmdb_id,
          media_type: row.media_type,
          title: info.title ?? info.name ?? '—',
          poster_path: info.poster_path ?? null,
          year: info.release_date ?? info.first_air_date ? new Date(info.release_date ?? info.first_air_date).getFullYear().toString() : null,
          assistido: assistidosSet.has(`${row.media_type}-${row.tmdb_id}`),
        } as WatchlistItem
      } catch { return null }
    })
  )
  return detalhes.filter(Boolean) as WatchlistItem[]
}

export function useWatchlist() {
  const { profileId } = useAuth()
  const queryClient = useQueryClient()

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['watchlist', profileId],
    queryFn: () => fetchWatchlist(profileId!),
    enabled: !!profileId,
    staleTime: 60_000,
  })

  async function remover(id: number) {
    // Otimista — remove do cache imediatamente
    queryClient.setQueryData<WatchlistItem[]>(['watchlist', profileId], (prev) => prev?.filter((i) => i.id !== id) ?? [])
    await supabase.from('watchlist').delete().eq('id', id)
  }

  const paraAssistir = data.filter((i) => !i.assistido)
  const assistidos = data.filter((i) => i.assistido)

  return { items: data, paraAssistir, assistidos, loading, remover }
}
