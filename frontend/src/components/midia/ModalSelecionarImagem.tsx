import { useEffect, useState } from 'react'
import { X, Check, Loader2, AlertCircle } from 'lucide-react'
import { getImagensMidia, salvarPreferenciaMidia, tmdbImage, type TMDBImage } from '../../lib/api'
import { getAuthHeader } from '../../lib/supabase'

interface Props {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  // qual imagem está sendo trocada
  modo: 'poster' | 'backdrop'
  // caminhos atualmente ativos (para mostrar qual está selecionado)
  posterAtual: string | null
  backdropAtual: string | null
  onSalvar: (poster: string | null, backdrop: string | null) => void
  onFechar: () => void
}

export function ModalSelecionarImagem({
  tmdbId,
  mediaType,
  modo,
  posterAtual,
  backdropAtual,
  onSalvar,
  onFechar,
}: Props) {
  const [imagens, setImagens] = useState<{ posters: TMDBImage[]; backdrops: TMDBImage[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [abaSelecionada, setAbaSelecionada] = useState<'poster' | 'backdrop'>(modo)
  const [posterSelecionado, setPosterSelecionado] = useState<string | null>(posterAtual)
  const [backdropSelecionado, setBackdropSelecionado] = useState<string | null>(backdropAtual)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    getImagensMidia(mediaType, tmdbId)
      .then((res) => setImagens(res.data))
      .catch(() => setErro('Não foi possível carregar as imagens.'))
      .finally(() => setLoading(false))
  }, [tmdbId, mediaType])

  //bloqueia scroll do body enquanto modal está aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSalvar() {
    setSalvando(true)
    try {
      const authHeader = await getAuthHeader()
      await salvarPreferenciaMidia(
        {
          tmdb_id: tmdbId,
          media_type: mediaType,
          custom_poster_path: posterSelecionado,
          custom_backdrop_path: backdropSelecionado,
        },
        authHeader,
      )
      onSalvar(posterSelecionado, backdropSelecionado)
    } catch (err) {
      console.error('[ModalSelecionarImagem] erro ao salvar:', err)
      // aplica localmente mesmo se falhar no backend
      onSalvar(posterSelecionado, backdropSelecionado)
    } finally {
      setSalvando(false)
    }
  }

  const listaAtual = abaSelecionada === 'poster'
    ? (imagens?.posters ?? [])
    : (imagens?.backdrops ?? [])

  const selecionadoAtual = abaSelecionada === 'poster' ? posterSelecionado : backdropSelecionado

  function selecionar(path: string) {
    if (abaSelecionada === 'poster') setPosterSelecionado(path)
    else setBackdropSelecionado(path)
  }

  const houveMudanca =
    posterSelecionado !== posterAtual || backdropSelecionado !== backdropAtual

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0f0f13]/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar imagem"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pb-3 pt-4 border-b border-[#2a2a38]">
        <h2 className="text-base font-semibold text-[#f1f1f3]">Trocar imagem</h2>
        <button
          onClick={onFechar}
          aria-label="Fechar"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1c24] text-[#9898ac] hover:text-[#f1f1f3]"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      {/* Tabs poster / backdrop */}
      <div className="flex border-b border-[#2a2a38]">
        {(['poster', 'backdrop'] as const).map((aba) => (
          <button
            key={aba}
            onClick={() => setAbaSelecionada(aba)}
            className={[
              'flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-colors',
              abaSelecionada === aba
                ? 'border-b-2 border-[#6366f1] text-[#f1f1f3]'
                : 'text-[#5a5a72]',
            ].join(' ')}
          >
            {aba === 'poster' ? 'Poster' : 'Backdrop'}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#6366f1]" />
          </div>
        )}

        {erro && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm text-[#9898ac]">{erro}</p>
          </div>
        )}

        {!loading && !erro && (
          <div className={[
            'grid gap-2',
            abaSelecionada === 'poster'
              ? 'grid-cols-3'       // posters: proporção 2/3, cabe 3 por linha
              : 'grid-cols-2',      // backdrops: proporção 16/9, cabe 2 por linha
          ].join(' ')}>
            {listaAtual.map((img) => {
              const url = tmdbImage(img.file_path, abaSelecionada === 'poster' ? 'w342' : 'w500')
              if (!url) return null
              const ativo = selecionadoAtual === img.file_path

              return (
                <button
                  key={img.file_path}
                  onClick={() => selecionar(img.file_path)}
                  aria-pressed={ativo}
                  className={[
                    'relative overflow-hidden rounded-xl border-2 transition-all duration-150',
                    ativo ? 'border-[#6366f1]' : 'border-transparent',
                  ].join(' ')}
                >
                  <img
                    src={url}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className={[
                      'w-full object-cover transition-opacity duration-150',
                      abaSelecionada === 'poster' ? 'aspect-[2/3]' : 'aspect-video',
                      ativo ? 'opacity-100' : 'opacity-70',
                    ].join(' ')}
                  />

                  {/* Badge de selecionado */}
                  {ativo && (
                    <div className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#6366f1] shadow-lg">
                      <Check size={13} className="text-white" aria-hidden="true" />
                    </div>
                  )}
                </button>
              )
            })}

            {listaAtual.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-[#5a5a72]">
                Nenhuma imagem disponível.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Botão salvar */}
      <div className="border-t border-[#2a2a38] px-4 py-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        <button
          onClick={handleSalvar}
          disabled={!houveMudanca || salvando}
          className={[
            'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-colors',
            houveMudanca && !salvando
              ? 'bg-[#6366f1] text-white hover:bg-[#7577f3]'
              : 'bg-[#1c1c24] text-[#5a5a72] cursor-not-allowed',
          ].join(' ')}
        >
          {salvando
            ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            : <Check size={16} aria-hidden="true" />
          }
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}
