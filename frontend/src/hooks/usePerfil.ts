import { useEffect, useState } from 'react'
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

export function usePerfil() {
  const { profileId } = useAuth()
  const [perfil, setPerfil] = useState<PerfilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!profileId) { setLoading(false); return }
    carregar()
  }, [profileId])

  async function carregar() {
    setLoading(true)
    const [profileRes, seguidoresRes, seguindoRes, reviewsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, backdrop_url')
        .eq('id', profileId)
        .single(),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileId),
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId),
    ])

    if (profileRes.data) {
      setPerfil({
        ...profileRes.data,
        seguidores: seguidoresRes.count ?? 0,
        seguindo: seguindoRes.count ?? 0,
        reviews: reviewsRes.count ?? 0,
      })
    }    setLoading(false)
  }

  async function uploadImagem(tipo: 'avatar' | 'backdrop', file: File): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/${tipo}.${ext}`
    const { error } = await supabase.storage
      .from('profile-images')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) { console.error('[upload]', error.message); return null }
    const { data } = supabase.storage.from('profile-images').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  async function atualizarAvatar(file: File) {
    if (!profileId) return
    setSalvando(true)
    const url = await uploadImagem('avatar', file)
    if (url) {
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profileId)
      setPerfil((p) => p ? { ...p, avatar_url: url } : p)
    }
    setSalvando(false)
  }

  async function atualizarBackdrop(file: File) {
    if (!profileId) return
    setSalvando(true)
    const url = await uploadImagem('backdrop', file)
    if (url) {
      await supabase.from('profiles').update({ backdrop_url: url }).eq('id', profileId)
      setPerfil((p) => p ? { ...p, backdrop_url: url } : p)
    }
    setSalvando(false)
  }

  return { perfil, loading, salvando, atualizarAvatar, atualizarBackdrop }
}
