import { Router } from 'express'
import { detalhesFilme, provedoresFilme, detalhesSerie, temporadaSerie, detalhesEpisodio } from '../controllers/midia/midia.controller'

const router = Router()

// firmes
router.get('/filmes/:id',                        detalhesFilme)
router.get('/filmes/:id/providers',              provedoresFilme)

// series
router.get('/series/:id',                                              detalhesSerie)
router.get('/series/:id/temporadas/:numero',                           temporadaSerie)
router.get('/series/:id/temporadas/:temporada/episodios/:episodio',    detalhesEpisodio)

export default router
