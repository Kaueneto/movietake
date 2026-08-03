import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

export interface FavoriteFilm {
  position: number
  tmdb_id: number
  media_type: 'movie' | 'tv'
  title: string
  poster_path: string | null
}

export function useFavoriteFilms() {
  const { profileId } = useAuth()
  const [films, setFilms] = useState<FavoriteFilm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) { setLoading(false); return }
    carregar()
  }, [profileId])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('profile_favorite_films')
      .select('position, tmdb_id, media_type')
      .eq('user_id', profileId)
      .order('position')

    if (!data || data.length === 0) { setFilms([]); setLoading(false); return }

    const detalhes = await Promise.all(
      data.map(async (row) => {
        try {
          const rota = row.media_type === 'movie' ? `/filmes/${row.tmdb_id}` : `/series/${row.tmdb_id}`
          const { data: info } = await api.get<any>(rota)
          return {
            position: row.position,
            tmdb_id: row.tmdb_id,
            media_type: row.media_type,
            title: info.title ?? info.name ?? '—',
            poster_path: info.poster_path ?? null,
          } as FavoriteFilm
        } catch { return null }
      })
    )
    setFilms(detalhes.filter(Boolean) as FavoriteFilm[])
    setLoading(false)
  }

  async function definir(position: number, tmdb_id: number, media_type: 'movie' | 'tv') {
    if (!profileId) return
    await supabase.from('profile_favorite_films').upsert(
      { user_id: profileId, tmdb_id, media_type, position },
      { onConflict: 'user_id,position' }
    )
    await carregar()
  }

  async function remover(position: number) {
    if (!profileId) return
    setFilms((f) => f.filter((x) => x.position !== position))
    await supabase.from('profile_favorite_films')
      .delete().eq('user_id', profileId).eq('position', position)
  }

  return { films, loading, definir, remover }
}
