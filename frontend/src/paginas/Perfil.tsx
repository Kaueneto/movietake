import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, ChevronRight, Loader2, Bookmark,
  Film, Tv, BookmarkX, Camera, ImagePlus, Plus,
} from 'lucide-react'
import { PageLayout } from '../components/layout/PageLayout'
import { useAuth } from '../lib/AuthContext'
import { usePerfil } from '../hooks/usePerfil'
import { useWatchlist, type WatchlistItem } from '../hooks/useWatchlist'
import { useFavoriteFilms } from '../hooks/useFavoriteFilms'
import { tmdbImage } from '../lib/api'
import { ModalSelecionarFavorito } from '../components/perfil/ModalSelecionarFavorito'

export function Perfil() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { perfil, atualizarAvatar, atualizarBackdrop } = usePerfil()
  const [salvandoImg, setSalvandoImg] = useState(false)
  const { items: watchlist, loading: loadingWl } = useWatchlist()
  const { films: favFilms, loading: loadingFav, definir: definirFavorito } = useFavoriteFilms()
  const [slotEditando, setSlotEditando] = useState<number | null>(null)
  const [saindo, setSaindo] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const backdropInputRef = useRef<HTMLInputElement>(null)

  const displayName = perfil?.display_name ?? user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? 'Usuário'
  const username = perfil?.username ?? user?.email?.split('@')[0] ?? ''
  const avatarUrl = perfil?.avatar_url
  const backdropUrl = perfil?.backdrop_url
  const avatarLetra = displayName[0]?.toUpperCase() ?? '?'

  async function handleSignOut() {
    setSaindo(true)
    await signOut()
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) { setSalvandoImg(true); atualizarAvatar(file).finally(() => setSalvandoImg(false)) }
    e.target.value = ''
  }

  function handleBackdropChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) { setSalvandoImg(true); atualizarBackdrop(file).finally(() => setSalvandoImg(false)) }
    e.target.value = ''
  }

  return (
    <PageLayout noPadding>

      {/* Modal de seleção de favorito */}
      {slotEditando && (
        <ModalSelecionarFavorito
          position={slotEditando}
          onSelecionar={async (tmdb_id, media_type) => {
            await definirFavorito(slotEditando, tmdb_id, media_type)
            setSlotEditando(null)
          }}
          onFechar={() => setSlotEditando(null)}
        />
      )}

      <div className="relative mb-20">
        {/* Backdrop */}
        <div
          className="relative w-full overflow-hidden bg-[#16161c] cursor-pointer group"
          style={{ height: 'calc(180px + env(safe-area-inset-top, 0px))' }}
          onClick={() => backdropInputRef.current?.click()}
          role="button"
          aria-label="Alterar foto de capa"
        >
          {backdropUrl ? (
            <img src={backdropUrl} alt="" aria-hidden="true" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#1c1c24] to-[#0f0f13]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0f0f13]" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
            <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <ImagePlus size={14} className="text-white" aria-hidden="true" />
              <span className="text-xs font-medium text-white">Alterar capa</span>
            </div>
          </div>
        </div>

        {/* avatar + info — sobrepostos */}
        <div className="absolute -bottom-16 left-4 flex items-end gap-3 right-4">
          {/* avatar */}
          <div
            className="relative cursor-pointer shrink-0"
            onClick={() => avatarInputRef.current?.click()}
            role="button"
            aria-label="Alterar foto de perfil"
          >
            <div className="h-20 w-20 overflow-hidden rounded-full border-[3px] border-[#0f0f13] bg-[#1c1c24] shadow-xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#6366f1]/15 text-2xl font-bold text-[#6366f1]">
                  {avatarLetra}
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0f0f13] bg-[#6366f1] shadow-md">
              <Camera size={11} className="text-white" aria-hidden="true" />
            </div>
            {salvandoImg && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Loader2 size={16} className="animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Nome + @username + stats */}
          <div className="pb-1 min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight text-[#f1f1f3]">{displayName}</p>
            <p className="text-xs text-[#5a5a72]">@{username}</p>
            {perfil && (
              <div className="mt-1.5 flex items-center gap-3">
                <Stat valor={perfil.seguidores} label="seguidores" />
                <Stat valor={perfil.seguindo} label="seguindo" />
                <Stat valor={perfil.reviews} label="reviews" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inputs ocultos */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} aria-hidden="true" />
      <input ref={backdropInputRef} type="file" accept="image/*" className="hidden" onChange={handleBackdropChange} aria-hidden="true" />

      <div className="px-4 pb-28 space-y-6">

        {/* Filmes favoritos */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#5a5a72]">Filmes favoritos</p>
          {loadingFav ? (
            <div className="flex justify-center py-6">
              <Loader2 size={25} className="animate-spin text-[#5a5a72]" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((pos) => {
                const film = favFilms.find((f) => f.position === pos)
                const poster = film ? tmdbImage(film.poster_path, 'w185') : null
                return (
                  <div key={pos} className="flex flex-col gap-1">
                    <div className="aspect-[2/3] overflow-hidden rounded-xl bg-[#1c1c24]">
                      {film && poster ? (
                        <img src={poster} alt={film.title} loading="lazy" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <button
                          onClick={() => setSlotEditando(pos)}
                          className="flex h-full w-full items-center justify-center text-[#2a2a38] hover:text-[#6366f1] transition-colors"
                          aria-label={`Adicionar filme favorito ${pos}`}
                        >
                          <Plus size={22} />
                        </button>
                      )}
                    </div>
                    {film && (
                      <p className="line-clamp-1 text-center text-[10px] text-[#5a5a72]">{film.title}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quero assistir */}
        <div>
          <button
            onClick={() => navigate('/watchlist')}
            className="mb-3 flex w-full items-center justify-between"
            aria-label="Ver lista de quero assistir"
          >
            <div className="flex items-center gap-2">
              <Bookmark size={15} className="text-[#6366f1]" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#f1f1f3]">Quero assistir</p>
            </div>
            <div className="flex items-center gap-2">
              {watchlist.length > 0 && (
                <span className="rounded-full bg-[#6366f1]/15 px-2.5 py-0.5 text-xs font-semibold text-[#6366f1]">
                  {watchlist.length}
                </span>
              )}
              <ChevronRight size={15} className="text-[#5a5a72]" aria-hidden="true" />
            </div>
          </button>

          {loadingWl ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={22} className="animate-spin text-[#5a5a72]" aria-label="Carregando" />
            </div>
          ) : watchlist.length === 0 ? (
            <button
              onClick={() => navigate('/pesquisar')}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-[#2a2a38] bg-[#1c1c24] py-10 text-center transition-colors hover:border-[#6366f1]/30"
            >
              <BookmarkX size={28} className="text-[#2a2a38]" aria-hidden="true" />
              <p className="text-sm text-[#5a5a72]">Sua lista está vazia</p>
              <p className="text-xs text-[#6366f1]">Explorar filmes e séries</p>
            </button>
          ) : (
            <button onClick={() => navigate('/watchlist')} className="w-full text-left">
              <PosterStack items={watchlist} />
            </button>
          )}
        </div>

        {/* Em breve */}
        <div className="space-y-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5a5a72]">Em breve</p>
          <div className="flex flex-col gap-1 opacity-50">
            <PlaceholderRow label="Histórico de visualizações" />
            <PlaceholderRow label="Minhas listas" />
            <PlaceholderRow label="Seguidores / Seguindo" />
            <PlaceholderRow label="Editar perfil" />
          </div>
        </div>

        {/* Sair */}
        <button
          onClick={handleSignOut}
          disabled={saindo}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          aria-label="Sair da conta"
        >
          {saindo ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}
          {saindo ? 'Saindo...' : 'Sair da conta'}
        </button>
      </div>
    </PageLayout>
  )
}

// Posters sobrepostos sem bordas grossas
function PosterStack({ items }: { items: WatchlistItem[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const POSTER_W = 88
  const OVERLAP = 28
  const totalWidth = POSTER_W + (items.length - 1) * (POSTER_W - OVERLAP)

  return (
    <div className="overflow-x-auto overflow-y-visible pb-2" style={{ scrollbarWidth: 'none' }}>
      <div className="relative" style={{ height: 132, width: Math.max(totalWidth, 0), minWidth: '100%' }}>
        {items.map((item, i) => {
          const isHovered = hovered === item.id
          return (
            <div
              key={item.id}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              className="absolute top-0 transition-all duration-200"
              style={{
                left: i * (POSTER_W - OVERLAP),
                width: POSTER_W,
                zIndex: isHovered ? 20 : i + 1,
                transform: isHovered ? 'translateY(-6px) scale(1.04)' : 'none',
              }}
            >
              <div
                className="overflow-hidden rounded-xl"
                style={{
                  height: 132,
                  boxShadow: isHovered ? '0 8px 24px rgba(99,102,241,0.3)' : '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                {item.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#1c1c24] text-[#5a5a72]">
                    {item.media_type === 'tv' ? <Tv size={22} /> : <Film size={22} />}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlaceholderRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#2a2a38] bg-[#1c1c24] px-4 py-3">
      <span className="text-sm text-[#9898ac]">{label}</span>
      <ChevronRight size={15} className="text-[#2a2a38]" aria-hidden="true" />
    </div>
  )
}

function Stat({ valor, label }: { valor: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-sm font-bold text-[#f1f1f3]">{valor}</span>
      <span className="text-xs text-[#5a5a72]">{label}</span>
    </span>
  )
}
