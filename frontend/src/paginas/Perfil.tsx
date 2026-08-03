import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, User, Mail, Shield, ChevronRight,
  Loader2, Bookmark, Film, Tv, BookmarkX,
} from 'lucide-react'
import { PageLayout } from '../components/layout/PageLayout'
import { useAuth } from '../lib/AuthContext'
import { useWatchlist, type WatchlistItem } from '../hooks/useWatchlist'
import { tmdbImage } from '../lib/api'

export function Perfil() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [saindo, setSaindo] = useState(false)

  const { items: watchlist, loading: loadingWl } = useWatchlist()

  const username = user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? 'Usuário'
  const email = user?.email ?? ''
  const avatarLetra = username[0]?.toUpperCase() ?? '?'

  async function handleSignOut() {
    setSaindo(true)
    await signOut()
  }

  return (
    <PageLayout noPadding>
      {/* Hero do perfil */}
      <div className="flex flex-col items-center gap-3 px-4 pt-8 pb-6">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[#6366f1]/20 text-3xl font-bold text-[#6366f1]"
          aria-hidden="true"
        >
          {avatarLetra}
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold text-[#f1f1f3]">{username}</h1>
          <p className="text-sm text-[#5a5a72]">{email}</p>
        </div>
      </div>

      <div className="px-4 pb-28 space-y-6">

        {/* infos da conta */}
        <div className="space-y-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5a5a72]">Conta</p>
          <InfoRow icon={<User size={17} />} label="Nome de usuário" value={username} />
          <InfoRow icon={<Mail size={17} />} label="E-mail" value={email} />
          <InfoRow
            icon={<Shield size={17} />}
            label="Status"
            value={user?.email_confirmed_at ? 'Verificado' : 'Aguardando verificação'}
            valueClass={user?.email_confirmed_at ? 'text-green-400' : 'text-yellow-400'}
          />
        </div>

        {/* quero assistir */}
        <div>
          <button
            onClick={() => navigate('/watchlist')}
            className="mb-3 flex w-full items-center justify-between"
            aria-label="Ver lista completa de quero assistir"
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

      {/* bt de sair  */}
        <button
          onClick={handleSignOut}
          disabled={saindo}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          aria-label="Sair da conta"
        >
          {saindo
            ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            : <LogOut size={16} aria-hidden="true" />
          }
          {saindo ? 'Saindo...' : 'Sair da conta'}
        </button>
      </div>
    </PageLayout>
  )
}

// Layout de posters sobrepostos — clique no bloco navega para /watchlist
function PosterStack({ items }: { items: WatchlistItem[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  // Largura visível de cada poster (a parte que fica exposta)
  const POSTER_W = 88   // largura total do poster
  const OVERLAP = 28    // quanto o próximo cobre o anterior

  const totalWidth = POSTER_W + (items.length - 1) * (POSTER_W - OVERLAP)

  return (
    <div
      className="relative overflow-x-auto overflow-y-visible pb-2"
      style={{ scrollbarWidth: 'none' }}
      aria-label="Lista de filmes e séries para assistir"
    >
      {/* Container com largura exata para os posters sobrepostos */}
      <div
        className="relative"
        style={{
          height: 148,  // aspect 2/3 de 88px ≈ 132px + texto
          width: Math.max(totalWidth, 0),
          minWidth: '100%',
        }}
      >
        {items.map((item, i) => {
          const poster = tmdbImage(item.poster_path, 'w185')
          const isTV = item.media_type === 'tv'
          const isHovered = hovered === item.id
          const left = i * (POSTER_W - OVERLAP)

          return (
            <button
              key={item.id}
              onClick={() => {/* navegação via bloco pai */}}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => setHovered(item.id)}
              onTouchEnd={() => setHovered(null)}
              aria-label={`${item.title}${item.year ? ` (${item.year})` : ''}`}
              className="absolute top-0 transition-all duration-200 focus:outline-none"
              style={{
                left,
                width: POSTER_W,
                zIndex: isHovered ? 20 : i + 1,
                transform: isHovered ? 'translateY(-6px) scale(1.04)' : 'none',
              }}
            >
              {/* Poster */}
              <div
                className="overflow-hidden rounded-xl border-2 shadow-lg"
                style={{
                  height: 132,
                  borderColor: isHovered ? '#6366f1' : 'rgba(255,255,255,0.08)',
                  boxShadow: isHovered
                    ? '0 8px 24px rgba(99,102,241,0.35)'
                    : '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                {poster ? (
                  <img
                    src={poster}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#1c1c24] text-[#5a5a72]">
                    {isTV ? <Tv size={22} /> : <Film size={22} />}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, valueClass }: {
  icon: React.ReactNode
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#2a2a38] bg-[#1c1c24] px-4 py-3">
      <span className="text-[#5a5a72]" aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#5a5a72]">{label}</p>
        <p className={`truncate text-sm font-medium ${valueClass ?? 'text-[#f1f1f3]'}`}>{value}</p>
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
