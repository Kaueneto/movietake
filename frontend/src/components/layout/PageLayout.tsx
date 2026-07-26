import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Remove padding padrão (ex: para telas com header próprio) */
  noPadding?: boolean
}

/** Wrapper para todas as páginas — aplica padding-bottom para nao sobrepor a BottomNav */
export function PageLayout({ children, noPadding }: Props) {
  return (
    <main
      className={[
        'min-h-screen bg-[#0f0f13] pb-24',
        noPadding ? '' : 'px-4 pt-5',
      ].join(' ')}
    >
      {children}
    </main>
  )
}
