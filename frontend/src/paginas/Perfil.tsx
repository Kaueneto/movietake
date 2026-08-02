import { useState } from 'react'
import { LogOut, User, Mail, Shield, ChevronRight, Loader2 } from 'lucide-react'
import { PageLayout } from '../components/layout/PageLayout'
import { useAuth } from '../lib/AuthContext'

export function Perfil() {
  const { user, signOut } = useAuth()
  const [saindo, setSaindo] = useState(false)

  const username = user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? 'Usuário'
  const email = user?.email ?? ''
  const avatarLetra = username[0]?.toUpperCase() ?? '?'

  async function handleSignOut() {
    setSaindo(true)
    await signOut()
  }

  return (
    <PageLayout>
      <div className="mb-6 flex flex-col items-center gap-3 pt-2">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#6366f1]/20 text-3xl font-bold text-[#6366f1]"
          aria-hidden="true"
        >
          {avatarLetra}
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold text-[#f1f1f3]">{username}</h1>
          <p className="text-sm text-[#5a5a72]">{email}</p>
        </div>
      </div>

          <div className="mb-4 space-y-2">
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

  
      <div className="mb-6 space-y-2">
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
    </PageLayout>
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
