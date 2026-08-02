import { createClient } from '@supabase/supabase-js'
import { env } from './env'

// Cliente admin (service_role) — apenas para operações internas do servidor
export const supabaseAdmin = createClient(
  env.supabase.url,
  env.supabase.anonKey, // trocar por service_role key quando disponível
  { auth: { persistSession: false } }
)

// cria um cliente autenticado com o JWT do usuário vindo do header Authorization
// usado nos controllers para que as políticas RLS sejam aplicadas corretamente
export function supabaseForUser(authHeader: string | undefined) {
  const token = authHeader?.replace('Bearer ', '') ?? ''
  return createClient(env.supabase.url, env.supabase.anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}
