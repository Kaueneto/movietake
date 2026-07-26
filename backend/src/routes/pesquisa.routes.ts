import { Router } from 'express'
import { buscar, trending } from '../controllers/pesquisa/pesquisa.controller'

const router = Router()

router.get('/', buscar)           // GET /api/pesquisa?q=batman&tipo=all
router.get('/trending', trending) // GET /api/pesquisa/trending

export default router
