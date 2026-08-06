import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

interface AcoesData {
  assistido: boolean
  naWatchlist: boolean
  favorito: boolean
}

async function fetchAcoes(profileId: number, tmdbId: number, mediaType: string): Promise<AcoesData> {
  const [histRes, wlRes, favRes] = await Promise.all([
    supabase.from('watch_history').select('id').eq('user_id', profileId).eq('tmdb_id', tmdbId).eq('media_type', mediaType).limit(1),
    supabase.from('watchlist').select('id').eq('user_id', profileId).eq('tmdb_id', tmdbId).eq('media_type', mediaType).maybeSingle(),
    supabase.from('favorites').select('id').eq('user_id', profileId).eq('tmdb_id', tmdbId).eq('media_type', mediaType).maybeSingle(),
  ])
  return {
    assistido: (histRes.data?.length ?? 0) > 0,
    naWatchlist: !!wlRes.data,
    favorito: !!favRes.data,
  }
}

export function useUserActions(tmdbId: number, mediaType: 'movie' | 'tv') {
  const { profileId } = useAuth()
  const queryClient = useQueryClient()
  const key = ['userActions', profileId, tmdbId, mediaType]

  const { data, isFetching } = useQuery({
    queryKey: key,
    queryFn: () => fetchAcoes(profileId!, tmdbId, mediaType),
    enabled: !!profileId && tmdbId > 0,
    staleTime: 30_000,
  })

  const estado: AcoesData = data ?? { assistido: false, naWatchlist: false, favorito: false }

  function atualizar(patch: Partial<AcoesData>) {
    queryClient.setQueryData<AcoesData>(key, (prev) => ({ ...(prev ?? estado), ...patch }))
  }

  async function toggleAssistido() {
    if (!profileId) return
    if (estado.assistido) {
      atualizar({ assistido: false })
      const { data: rows } = await supabase.from('watch_history').select('id').eq('user_id', profileId).eq('tmdb_id', tmdbId).eq('media_type', mediaType).order('watched_at', { ascending: false }).limit(1)
      if (rows?.[0]) await supabase.from('watch_history').delete().eq('id', rows[0].id)
    } else {
      atualizar({ assistido: true })
      await supabase.from('watch_history').insert({ user_id: profileId, tmdb_id: tmdbId, media_type: mediaType })
      // watchlist permanece — separada em "assistidos" na tela
      queryClient.invalidateQueries({ queryKey: ['watchlist', profileId] })
    }
  }

  async function toggleWatchlist() {
    if (!profileId) return
    if (estado.naWatchlist) {
      atualizar({ naWatchlist: false })
      await supabase.from('watchlist').delete().eq('user_id', profileId).eq('tmdb_id', tmdbId).eq('media_type', mediaType)
    } else {
      atualizar({ naWatchlist: true })
      await supabase.from('watchlist').upsert({ user_id: profileId, tmdb_id: tmdbId, media_type: mediaType }, { onConflict: 'user_id,tmdb_id,media_type' })
    }
    queryClient.invalidateQueries({ queryKey: ['watchlist', profileId] })
  }

  async function toggleFavorito() {
    if (!profileId) return
    if (estado.favorito) {
      atualizar({ favorito: false })
      await supabase.from('favorites').delete().eq('user_id', profileId).eq('tmdb_id', tmdbId).eq('media_type', mediaType)
    } else {
      atualizar({ favorito: true })
      await supabase.from('favorites').upsert({ user_id: profileId, tmdb_id: tmdbId, media_type: mediaType }, { onConflict: 'user_id,tmdb_id,media_type' })
    }
  }

  return {
    assistido: estado.assistido,
    naWatchlist: estado.naWatchlist,
    favorito: estado.favorito,
    loadingAssistido: isFetching,
    loadingWatchlist: isFetching,
    loadingFavorito: isFetching,
    toggleAssistido,
    toggleWatchlist,
    toggleFavorito,
  }
}
