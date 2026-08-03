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
  assistido: boolean
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
      // Busca watchlist e watch_history em paralelo
      const [wlRes, histRes] = await Promise.all([
        supabase
          .from('watchlist')
          .select('id, tmdb_id, media_type')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false }),
        supabase
          .from('watch_history')
          .select('tmdb_id, media_type')
          .eq('user_id', profileId),
      ])

      if (!wlRes.data || wlRes.data.length === 0) {
        setItems([])
        return
      }

      // Monta set de itens já assistidos para lookup O(1)
      const assistidosSet = new Set(
        (histRes.data ?? []).map((h) => `${h.media_type}-${h.tmdb_id}`)
      )

      const lote = wlRes.data.slice(0, 40)
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
              assistido: assistidosSet.has(`${row.media_type}-${row.tmdb_id}`),
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

  // Itens separados por status
  const paraAssistir = items.filter((i) => !i.assistido)
  const assistidos = items.filter((i) => i.assistido)

  return { items, paraAssistir, assistidos, loading, remover, recarregar: carregar }
}
