import { useQuery, useQueryClient } from '@tanstack/react-query'
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

async function fetchFavoriteFilms(profileId: number): Promise<FavoriteFilm[]> {
  const { data } = await supabase
    .from('profile_favorite_films')
    .select('position, tmdb_id, media_type')
    .eq('user_id', profileId)
    .order('position')

  if (!data || data.length === 0) return []

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
  return detalhes.filter(Boolean) as FavoriteFilm[]
}

export function useFavoriteFilms() {
  const { profileId } = useAuth()
  const queryClient = useQueryClient()

  const { data: films = [], isLoading: loading } = useQuery({
    queryKey: ['favoriteFilms', profileId],
    queryFn: () => fetchFavoriteFilms(profileId!),
    enabled: !!profileId,
    staleTime: 5 * 60_000,
  })

  async function definir(position: number, tmdb_id: number, media_type: 'movie' | 'tv') {
    if (!profileId) return
    await supabase.from('profile_favorite_films').upsert(
      { user_id: profileId, tmdb_id, media_type, position },
      { onConflict: 'user_id,position' }
    )
    queryClient.invalidateQueries({ queryKey: ['favoriteFilms', profileId] })
  }

  async function remover(position: number) {
    if (!profileId) return
    queryClient.setQueryData<FavoriteFilm[]>(['favoriteFilms', profileId], (prev) => prev?.filter((x) => x.position !== position) ?? [])
    await supabase.from('profile_favorite_films').delete().eq('user_id', profileId).eq('position', position)
  }

  return { films, loading, definir, remover }
}
