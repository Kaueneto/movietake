import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

interface EstadoAcoes {
  assistido: boolean
  naWatchlist: boolean
  favorito: boolean
  loadingAssistido: boolean
  loadingWatchlist: boolean
  loadingFavorito: boolean
}

// hook que gerencia as ações do usuário para um filme ou série
// carrega o estado atual do banco e oferece toggles que persistem
export function useUserActions(tmdbId: number, mediaType: 'movie' | 'tv') {
  const { profileId } = useAuth()

  const [estado, setEstado] = useState<EstadoAcoes>({
    assistido: false,
    naWatchlist: false,
    favorito: false,
    loadingAssistido: false,
    loadingWatchlist: false,
    loadingFavorito: false,
  })

  // carrega estado atual do banco ao montar
  useEffect(() => {
    if (!profileId) return

    async function carregar() {
      const [histRes, wlRes, favRes] = await Promise.all([
        supabase
          .from('watch_history')
          .select('id')
          .eq('user_id', profileId)
          .eq('tmdb_id', tmdbId)
          .eq('media_type', mediaType)
          .limit(1),
        supabase
          .from('watchlist')
          .select('id')
          .eq('user_id', profileId)
          .eq('tmdb_id', tmdbId)
          .eq('media_type', mediaType)
          .maybeSingle(),
        supabase
          .from('favorites')
          .select('id')
          .eq('user_id', profileId)
          .eq('tmdb_id', tmdbId)
          .eq('media_type', mediaType)
          .maybeSingle(),
      ])

      setEstado((prev) => ({
        ...prev,
        assistido: (histRes.data?.length ?? 0) > 0,
        naWatchlist: !!wlRes.data,
        favorito: !!favRes.data,
      }))
    }

    carregar()
  }, [profileId, tmdbId, mediaType])

  async function toggleAssistido() {
    if (!profileId) return
    setEstado((p) => ({ ...p, loadingAssistido: true }))

    try {
      if (estado.assistido) {
        // remove a entrada mais recente do histórico
        const { data } = await supabase
          .from('watch_history')
          .select('id')
          .eq('user_id', profileId)
          .eq('tmdb_id', tmdbId)
          .eq('media_type', mediaType)
          .order('watched_at', { ascending: false })
          .limit(1)

        if (data?.[0]) {
          await supabase.from('watch_history').delete().eq('id', data[0].id)
        }
        setEstado((p) => ({ ...p, assistido: false }))
      } else {
        await supabase.from('watch_history').insert({
          user_id: profileId,
          tmdb_id: tmdbId,
          media_type: mediaType,
        })
        // remove da watchlist automaticamente ao marcar como assistido
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', profileId)
          .eq('tmdb_id', tmdbId)
          .eq('media_type', mediaType)

        setEstado((p) => ({ ...p, assistido: true, naWatchlist: false }))
      }
    } finally {
      setEstado((p) => ({ ...p, loadingAssistido: false }))
    }
  }

  async function toggleWatchlist() {
    if (!profileId) return
    setEstado((p) => ({ ...p, loadingWatchlist: true }))

    try {
      if (estado.naWatchlist) {
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', profileId)
          .eq('tmdb_id', tmdbId)
          .eq('media_type', mediaType)
        setEstado((p) => ({ ...p, naWatchlist: false }))
      } else {
        await supabase.from('watchlist').upsert(
          { user_id: profileId, tmdb_id: tmdbId, media_type: mediaType },
          { onConflict: 'user_id,tmdb_id,media_type' }
        )
        setEstado((p) => ({ ...p, naWatchlist: true }))
      }
    } finally {
      setEstado((p) => ({ ...p, loadingWatchlist: false }))
    }
  }

  async function toggleFavorito() {
    if (!profileId) return
    setEstado((p) => ({ ...p, loadingFavorito: true }))

    try {
      if (estado.favorito) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', profileId)
          .eq('tmdb_id', tmdbId)
          .eq('media_type', mediaType)
        setEstado((p) => ({ ...p, favorito: false }))
      } else {
        await supabase.from('favorites').upsert(
          { user_id: profileId, tmdb_id: tmdbId, media_type: mediaType },
          { onConflict: 'user_id,tmdb_id,media_type' }
        )
        setEstado((p) => ({ ...p, favorito: true }))
      }
    } finally {
      setEstado((p) => ({ ...p, loadingFavorito: false }))
    }
  }

  return {
    ...estado,
    toggleAssistido,
    toggleWatchlist,
    toggleFavorito,
  }
}
