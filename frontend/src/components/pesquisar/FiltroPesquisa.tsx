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
      className="flex gap-1 rounded-xl border border-[#2a2a38] bg-[#1c1c24] p-1"
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
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
              active
                ? 'bg-[#6366f1] text-white'
                : 'text-[#9898ac] hover:bg-[#22222c] hover:text-[#f1f1f3]',
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
