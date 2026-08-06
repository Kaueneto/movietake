import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export interface PerfilData {
  id: number
  username: string
  display_name: string
  avatar_url: string | null
  backdrop_url: string | null
  seguidores: number
  seguindo: number
  reviews: number
}

async function fetchPerfil(profileId: number): Promise<PerfilData> {
  const [profileRes, seguidoresRes, seguindoRes, reviewsRes] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, avatar_url, backdrop_url').eq('id', profileId).single(),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', profileId),
  ])
  if (!profileRes.data) throw new Error('Perfil não encontrado')
  return {
    ...profileRes.data,
    seguidores: seguidoresRes.count ?? 0,
    seguindo: seguindoRes.count ?? 0,
    reviews: reviewsRes.count ?? 0,
  }
}

export function usePerfil() {
  const { profileId } = useAuth()
  const queryClient = useQueryClient()

  const { data: perfil, isLoading: loading } = useQuery({
    queryKey: ['perfil', profileId],
    queryFn: () => fetchPerfil(profileId!),
    enabled: !!profileId,
    // Cache por 2 minutos — perfil muda pouco
    staleTime: 2 * 60_000,
  })

  async function uploadImagem(tipo: 'avatar' | 'backdrop', file: File): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/${tipo}.${ext}`
    const { error } = await supabase.storage.from('profile-images').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { console.error('[upload]', error.message); return null }
    const { data } = supabase.storage.from('profile-images').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  async function atualizarAvatar(file: File) {
    if (!profileId) return
    const url = await uploadImagem('avatar', file)
    if (url) {
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profileId)
      // invalida o cache do perfil para recarregar com a nova foto
      queryClient.invalidateQueries({ queryKey: ['perfil', profileId] })
    }
  }

  async function atualizarBackdrop(file: File) {
    if (!profileId) return
    const url = await uploadImagem('backdrop', file)
    if (url) {
      await supabase.from('profiles').update({ backdrop_url: url }).eq('id', profileId)
      queryClient.invalidateQueries({ queryKey: ['perfil', profileId] })
    }
  }

  return { perfil, loading, atualizarAvatar, atualizarBackdrop }
}
