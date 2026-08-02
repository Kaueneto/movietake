import type { Request, Response } from 'express'
import * as tmdbService from '../../services/tmdb.service'
import { supabaseForUser } from '../../config/supabase'

// GET /api/imagens/:tipo/:id
// rota pública não requer autenticação
export async function imagensMidia(req: Request, res: Response) {
  const tipo = req.params.tipo as 'movie' | 'tv'
  const id = Number(req.params.id)

  if (!['movie', 'tv'].includes(tipo)) {
    res.status(400).json({ error: 'Tipo inválido. Use movie ou tv.' })
    return
  }
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido.' })
    return
  }

  try {
    const data = await tmdbService.getMediaImages(tipo, id)
    res.json({
      posters: (data.posters ?? [])
        .sort((a: any, b: any) => b.vote_average - a.vote_average)
        .slice(0, 30),
      backdrops: (data.backdrops ?? [])
        .sort((a: any, b: any) => b.vote_average - a.vote_average)
        .slice(0, 20),
    })
  } catch (err: any) {
    console.error('[imagensMidia] erro:', err?.message)
    res.status(502).json({ error: 'Falha ao buscar imagens no TMDB.' })
  }
}

// GET /api/preferencias/midia/:tipo/:tmdbId
// requer: requireAuth middleware (profileId injetado no request)

export async function getPreferencia(req: Request, res: Response) {
  const tipo = req.params.tipo as 'movie' | 'tv'
  const tmdbId = Number(req.params.tmdbId)

  if (!['movie', 'tv'].includes(tipo) || isNaN(tmdbId)) {
    res.status(400).json({ error: 'Parâmetros inválidos.' })
    return
  }

  const sb = supabaseForUser(req.headers.authorization)

  const { data, error } = await sb
    .from('user_media_preferences')
    .select('custom_poster_path, custom_backdrop_path')
    .eq('user_id', req.profileId)
    .eq('tmdb_id', tmdbId)
    .eq('media_type', tipo)
    .maybeSingle()

  if (error) {
    console.error('[getPreferencia] erro:', error.message)
    res.status(500).json({ error: 'Erro ao buscar preferência.' })
    return
  }

  res.json(data ?? { custom_poster_path: null, custom_backdrop_path: null })
}

// POST /api/preferencias/midia/batch
// reuqer: requireAuth middleware
export async function getPreferenciasBatch(req: Request, res: Response) {
  const items: Array<{ tmdb_id: number; media_type: string }> = req.body?.items ?? []

  if (!Array.isArray(items) || items.length === 0) {
    res.json([])
    return
  }

  const sb = supabaseForUser(req.headers.authorization)
  const validos = items.filter((i) => ['movie', 'tv'].includes(i.media_type))
  const tmdbIds = [...new Set(validos.map((i) => i.tmdb_id))]

  const { data, error } = await sb
    .from('user_media_preferences')
    .select('tmdb_id, media_type, custom_poster_path, custom_backdrop_path')
    .eq('user_id', req.profileId)
    .in('tmdb_id', tmdbIds)

  if (error) {
    console.error('[getPreferenciasBatch] erro:', error.message)
    res.json([])
    return
  }

  res.json(data ?? [])
}

// POST /api/preferencias/midia
// requer: requireAuth middleware
export async function salvarPreferencia(req: Request, res: Response) {
  const { tmdb_id, media_type, custom_poster_path, custom_backdrop_path } = req.body

  if (!tmdb_id || !media_type || !['movie', 'tv'].includes(media_type)) {
    res.status(400).json({ error: 'Campos obrigatórios: tmdb_id, media_type.' })
    return
  }

  const sb = supabaseForUser(req.headers.authorization)

  const { data, error } = await sb
    .from('user_media_preferences')
    .upsert(
      {
        user_id: req.profileId,
        tmdb_id,
        media_type,
        custom_poster_path: custom_poster_path ?? null,
        custom_backdrop_path: custom_backdrop_path ?? null,
      },
      { onConflict: 'user_id,tmdb_id,media_type' }
    )
    .select()
    .single()

  if (error) {
    console.error('[salvarPreferencia] erro:', error.message)
    res.status(500).json({ error: 'Erro ao salvar preferência.' })
    return
  }

  res.json(data)
}
