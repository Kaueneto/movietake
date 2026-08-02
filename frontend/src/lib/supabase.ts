import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  console.warn('[supabase] variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas')
}

export const supabase = createClient(url, key)

// retorna o Bearer token da sessão atual para enviar ao backend
export async function getAuthHeader(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? `Bearer ${token}` : undefined
}
