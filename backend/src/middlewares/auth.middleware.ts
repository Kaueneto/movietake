import type { Request, Response, NextFunction } from 'express'
import { supabaseForUser } from '../config/supabase'

// estende o tipo Request para carregar o profileId após validação
declare global {
  namespace Express {
    interface Request {
      profileId?: number
      authUserId?: string
    }
  }
}

// Middleware que valida o JWT do Supabase e injeta profileId no request
// Use em qualquer rota que exija autenticação
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido.' })
    return
  }

  const sb = supabaseForUser(authHeader)

  // valida o token com o Supabase Auth
  const { data: { user }, error } = await sb.auth.getUser()

  if (error || !user) {
    res.status(401).json({ error: 'Token inválido ou expirado.' })
    return
  }

  // busca o profile_id uma única vez e injeta no request
  const { data: profile } = await sb
    .from('profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!profile) {
    res.status(404).json({ error: 'Perfil não encontrado. Tente novamente em instantes.' })
    return
  }

  req.authUserId = user.id
  req.profileId = profile.id
  next()
}
