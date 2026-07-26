import type { Request, Response } from 'express'
import * as tmdbService from '../../services/tmdb.service'

type Tipo = tmdbService.MediaType | 'person'

/** GET /api/pesquisa?q=batman&tipo=all&pagina=1
 *  tipo: all | movie | tv | person
 */
export async function buscar(req: Request, res: Response) {
  const query = String(req.query.q ?? '').trim()
  const tipo = String(req.query.tipo ?? 'all') as Tipo
  const pagina = Number(req.query.pagina ?? 1)

  if (!query) {
    res.status(400).json({ error: 'O parâmetro "q" é obrigatório.' })
    return
  }

  try {
    let data

    if (tipo === 'movie') {
      data = await tmdbService.searchMovies(query, pagina)
    } else if (tipo === 'tv') {
      data = await tmdbService.searchSeries(query, pagina)
    } else if (tipo === 'person') {
      const raw = await tmdbService.searchPeople(query, pagina)
      // A API /search/person nao retorna media_type em cada item — injetamos aqui
      raw.results = raw.results.map((p: any) => ({ ...p, media_type: 'person' }))
      data = raw
    } else {
      // 'all' — busca multi (retorna movie + tv + person misturados)
      data = await tmdbService.searchMulti(query, pagina)
    }

    res.json(data)
  } catch (err: any) {
    console.error('[pesquisa] erro:', err?.message)
    res.status(502).json({ error: 'Falha ao consultar o TMDB.' })
  }
}

/** GET /api/pesquisa/trending?tipo=all&janela=week */
export async function trending(req: Request, res: Response) {
  const tipo = String(req.query.tipo ?? 'all') as tmdbService.MediaType
  const janela = String(req.query.janela ?? 'week') as tmdbService.TimeWindow

  try {
    const data = await tmdbService.getTrending(tipo, janela)
    res.json(data)
  } catch (err: any) {
    console.error('[trending] erro:', err?.message)
    res.status(502).json({ error: 'Falha ao consultar o TMDB.' })
  }
}
