import type { Request, Response } from 'express'
import * as tmdbService from '../../services/tmdb.service'

export async function detalhesFilme(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido.' }); return }
  try {
    const data = await tmdbService.getMovieDetails(id)
    const br = data?.['watch/providers']?.results?.BR ?? null
    data.providers_br = br
    delete data['watch/providers']
    res.json(data)
  } catch (err: any) {
    console.error('[detalhesFilme] erro:', err?.message)
    res.status(502).json({ error: 'Falha ao consultar o TMDB.' })
  }
}

export async function provedoresFilme(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido.' }); return }
  try {
    const data = await tmdbService.getMovieProviders(id)
    res.json(data?.results?.BR ?? null)
  } catch (err: any) {
    console.error('[provedoresFilme] erro:', err?.message)
    res.status(502).json({ error: 'Falha ao consultar provedores.' })
  }
}

// GET /api/series/:id 
export async function detalhesSerie(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido.' }); return }
  try {
    const data = await tmdbService.getSerieDetails(id)
    const br = data?.['watch/providers']?.results?.BR ?? null
    data.providers_br = br
    delete data['watch/providers']
    res.json(data)
  } catch (err: any) {
    console.error('[detalhesSerie] erro:', err?.message)
    res.status(502).json({ error: 'Falha ao consultar o TMDB.' })
  }
}

// GET /api/series/:id/temporadas/:numero 
export async function temporadaSerie(req: Request, res: Response) {
  const id = Number(req.params.id)
  const numero = Number(req.params.numero)
  if (isNaN(id) || isNaN(numero)) { res.status(400).json({ error: 'Parâmetros inválidos.' }); return }
  try {
    const data = await tmdbService.getSerieSeason(id, numero)
    res.json(data)
  } catch (err: any) {
    console.error('[temporadaSerie] erro:', err?.message)
    res.status(502).json({ error: 'Falha ao consultar o TMDB.' })
  }
}

// GET /api/series/:id/temporadas/:temporada/episodios/:episodio
export async function detalhesEpisodio(req: Request, res: Response) {
  const id = Number(req.params.id)
  const temporada = Number(req.params.temporada)
  const episodio = Number(req.params.episodio)
  if (isNaN(id) || isNaN(temporada) || isNaN(episodio)) {
    res.status(400).json({ error: 'Parâmetros inválidos.' }); return
  }
  try {
    const data = await tmdbService.getEpisodeDetails(id, temporada, episodio)
    res.json(data)
  } catch (err: any) {
    console.error('[detalhesEpisodio] erro:', err?.message)
    res.status(502).json({ error: 'Falha ao consultar o TMDB.' })
  }
}
