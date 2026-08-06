// cache global de preferências de imagem — persiste durante toda a sessão
// evita o flash de poster padrão → poster customizado ao abrir a tela de detalhes
export const prefsCache: Record<string, { poster: string | null; backdrop: string | null }> = {}

export function getPrefCache(mediaType: string, tmdbId: number) {
  return prefsCache[`${mediaType}-${tmdbId}`] ?? null
}

export function setPrefCache(mediaType: string, tmdbId: number, poster: string | null, backdrop: string | null) {
  prefsCache[`${mediaType}-${tmdbId}`] = { poster, backdrop }
}
