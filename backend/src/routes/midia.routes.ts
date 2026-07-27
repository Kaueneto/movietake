import { Router } from 'express'
import { detalhesFilme, provedoresFilme } from '../controllers/midia/midia.controller'

const router = Router()

router.get('/filmes/:id',           detalhesFilme)    // GET /api/filmes/123
router.get('/filmes/:id/providers', provedoresFilme)  // GET /api/filmes/123/providers

export default router
