import { Search, Film, BookMarked, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Início', icon: <Home size={15} /> },
  { to: '/pesquisar', label: 'Pesquisar', icon: <Search size={15} /> },
  { to: '/listas', label: 'Minhas Listas', icon: <BookMarked size={15} /> },
]

export function Navbar() {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 backdrop-blur-lg">
      <nav
        className="mx-auto flex h-15 max-w-7xl items-center gap-6 px-6"
        aria-label="Navegação principal"
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-[var(--color-text-primary)]"
          aria-label="MovieTake — Início"
        >
          <Film size={22} className="text-[var(--color-accent)]" aria-hidden="true" />
          MovieTake
        </Link>

        {/* links */}
        <ul className="flex items-center gap-1" role="list">
          {links.map(({ to, label, icon }) => {
            const active = location.pathname === to
            return (
              <li key={to}>
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-text-primary)] [&>svg]:text-[var(--color-accent)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-primary)]',
                  ].join(' ')}
                >
                  {icon}
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
