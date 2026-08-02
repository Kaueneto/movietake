import { Router } from 'express'
import { imagensMidia, getPreferencia, getPreferenciasBatch, salvarPreferencia } from '../controllers/preferencias/preferencias.controller'
import { requireAuth } from '../middlewares/auth.middleware'

const router = Router()

// Pública — não precisa de token
router.get('/imagens/:tipo/:id', imagensMidia)

// Protegidas — requireAuth valida o JWT e injeta profileId
router.get('/preferencias/midia/:tipo/:tmdbId', requireAuth, getPreferencia)
router.post('/preferencias/midia/batch',         requireAuth, getPreferenciasBatch)
router.post('/preferencias/midia',               requireAuth, salvarPreferencia)

export default router
