import { Film, Tv, LayoutGrid, User } from 'lucide-react'
import type { FiltroTipo } from '../../lib/api'

export type { FiltroTipo }

interface Props {
  filtro: FiltroTipo
  onChange: (f: FiltroTipo) => void
}

const opcoes: { value: FiltroTipo; label: string; icon: React.ReactNode }[] = [
  { value: 'all',    label: 'Tudo',    icon: <LayoutGrid size={13} /> },
  { value: 'movie',  label: 'Filmes',  icon: <Film size={13} /> },
  { value: 'tv',     label: 'Séries',  icon: <Tv size={13} /> },
  { value: 'person', label: 'Pessoas', icon: <User size={13} /> },
]

export function FiltroPesquisa({ filtro, onChange }: Props) {
  return (
    <div
      className="flex gap-1 rounded-2xl border border-white/[0.06] bg-[#1c1c24]/80 p-1 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]"
      role="tablist"
      aria-label="Filtrar por tipo de mídia"
    >
      {opcoes.map((op) => {
        const active = filtro === op.value
        return (
          <button
            key={op.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(op.value)}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-all duration-200',
              active
                ? 'bg-[#343440] text-white shadow-[0_1px_1px_rgba(0,0,0,0.35),0_1px_0_rgba(255,255,255,0.08)_inset]'
                : 'text-[#9898ac] hover:bg-white/[0.05] hover:text-[#f1f1f3]',
            ].join(' ')}
          >
            {op.icon}
            {op.label}
          </button>
        )
      })}
    </div>
  )
}
