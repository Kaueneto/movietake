import type { Request, Response } from 'express'
import * as tmdbService from '../../services/tmdb.service'


//retorna os detalhes do filme como creditos, provedores etc
export async function detalhesFilme(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido.' })
    return
  }
  try {
    const data = await tmdbService.getMovieDetails(id)
    // extrai só o Brasil dos providers para não mandar o payload inteiro
    const br = data?.['watch/providers']?.results?.BR ?? null
    data.providers_br = br
    delete data['watch/providers']
    res.json(data)
  } catch (err: any) {
    console.error('[detalhesFilme] erro:', err?.message)
    res.status(502).json({ error: 'Falha ao consultar o TMDB.' })
  }
}

// GET /api/filmes/:id/providers — mantido para compatibilidade 
export async function provedoresFilme(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido.' })
    return
  }
  try {
    const data = await tmdbService.getMovieProviders(id)
    res.json(data?.results?.BR ?? null)
  } catch (err: any) {
    console.error('[provedoresFilme] erro:', err?.message)
    res.status(502).json({ error: 'Falha ao consultar provedores.' })
  }
}
