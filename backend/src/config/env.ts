import 'dotenv/config'

export const env = {
  port: Number(process.env.PORT) || 3001,

  tmdb: {
    apiKey: process.env.TMDB_API_KEY ?? '',
    readToken: process.env.TMDB_READ_TOKEN ?? '',
    baseUrl: 'https://api.themoviedb.org/3',
  },

  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
  },
}

// Valida variáveis obrigatórias na inicialização
const missing = Object.entries({
  TMDB_API_KEY: env.tmdb.apiKey,
  SUPABASE_URL: env.supabase.url,
  SUPABASE_ANON_KEY: env.supabase.anonKey,
})
  .filter(([, v]) => !v)
  .map(([k]) => k)

if (missing.length) {
  console.warn(`[env] Variáveis nao definidas: ${missing.join(', ')}`)
}
