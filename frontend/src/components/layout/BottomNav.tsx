import { Home, Search, Play, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/',          label: 'Feed',      icon: Home  },
  { to: '/pesquisar', label: 'Pesquisar', icon: Search },
  { to: '/assistindo', label: 'Assistindo', icon: Play },
  { to: '/perfil',    label: 'Perfil',    icon: User  },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#2a2a38] bg-[#0f0f13]/95 backdrop-blur-xl"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto flex max-w-lg items-center justify-around px-2 py-1" role="list">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end
              aria-label={label}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors',
                  isActive
                    ? 'text-[#6366f1]'
                    : 'text-[#5a5a72] hover:text-[#9898ac]',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={[
                    'flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200',
                    isActive ? 'bg-[#6366f1]/15' : '',
                  ].join(' ')}>
                    <Icon size={25} strokeWidth={isActive ? 2.5 : 1.8} aria-hidden="true" />
                  </span>
                  <span className={[
                    'text-[10px] font-medium tracking-wide transition-colors',
                    isActive ? 'text-[#6366f1]' : 'text-[#5a5a72]',
                  ].join(' ')}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      {/* safe area para iPhone — com viewport-fit=cover isso preenche abaixo da barra home */}
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  )
}
