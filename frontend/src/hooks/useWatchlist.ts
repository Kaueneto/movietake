import { useEffect, useState } from 'react'
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
}

export function useWatchlist() {
  const { profileId } = useAuth()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) { setLoading(false); return }
    carregar()
  }, [profileId])

  async function carregar() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('id, tmdb_id, media_type')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })

      if (error || !data || data.length === 0) {
        setItems([])
        return
      }

      // busca detalhes de cada item em paralelo (máx 20 por vez)
      const lote = data.slice(0, 20)
      const detalhes = await Promise.all(
        lote.map(async (row) => {
          try {
            const rota = row.media_type === 'movie'
              ? `/filmes/${row.tmdb_id}`
              : `/series/${row.tmdb_id}`
            const { data: info } = await api.get<any>(rota)
            const title = info.title ?? info.name ?? '—'
            const date = info.release_date ?? info.first_air_date ?? ''
            return {
              id: row.id,
              tmdb_id: row.tmdb_id,
              media_type: row.media_type,
              title,
              poster_path: info.poster_path ?? null,
              year: date ? new Date(date).getFullYear().toString() : null,
            } as WatchlistItem
          } catch {
            return null
          }
        })
      )

      setItems(detalhes.filter(Boolean) as WatchlistItem[])
    } finally {
      setLoading(false)
    }
  }

  async function remover(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('watchlist').delete().eq('id', id)
  }

  return { items, loading, remover, recarregar: carregar }
}
