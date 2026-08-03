import { CheckCheck, Bookmark, X } from 'lucide-react'

interface Props {
  // quantos episódios anteriores não estão marcados
  qtdAnteriores: number
  onMarcarTudo: () => void
  onApenasEste: () => void
  onFechar: () => void
}

export function ModalOrdemCronologica({ qtdAnteriores, onMarcarTudo, onApenasEste, onFechar }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Episódios anteriores não assistidos"
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-xs"
        onClick={onFechar}
        aria-hidden="true"
      />

     <div className="relative w-full sm:max-w-sm mx-auto rounded-t-3xl sm:rounded-2xl border-t sm:border border-[#2a2a38] bg-[#16161c] px-5 pt-5"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#2a2a38] sm:hidden" aria-hidden="true" />

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6366f1]/15">
          <CheckCheck size={22} className="text-[#6366f1]" aria-hidden="true" />
        </div>

        <h2 className="text-base font-bold text-[#f1f1f3]">
          Episódios anteriores não assistidos
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#9898ac]">
          Você tem{' '}
          <span className="font-semibold text-[#f1f1f3]">
            {qtdAnteriores} {qtdAnteriores === 1 ? 'episódio' : 'episódios'}
          </span>{' '}
          anterior{qtdAnteriores !== 1 ? 'es' : ''} não {qtdAnteriores === 1 ? 'marcado' : 'marcados'}.
          Deseja marcá-{qtdAnteriores === 1 ? 'lo' : 'los'} como assistido{qtdAnteriores !== 1 ? 's' : ''} também?
        </p>

       <div className="mt-5 flex flex-col gap-2.5">
         <button
            onClick={onMarcarTudo}
            className="flex items-center gap-3 rounded-2xl bg-[#6366f1] px-4 py-3.5 transition-colors hover:bg-[#7577f3] active:scale-[0.98]"
          >
            <CheckCheck size={18} className="shrink-0 text-white" aria-hidden="true" />
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Marcar tudo até aqui</p>
              <p className="text-xs text-white/70">Inclui todos os episódios anteriores</p>
            </div>
          </button>

         <button
            onClick={onApenasEste}
            className="flex items-center gap-3 rounded-2xl border border-[#2a2a38] bg-[#1c1c24] px-4 py-3.5 transition-colors hover:border-[#6366f1]/40 hover:bg-[#22222d] active:scale-[0.98]"
          >
            <Bookmark size={18} className="shrink-0 text-[#9898ac]" aria-hidden="true" />
            <div className="text-left">
              <p className="text-sm font-semibold text-[#f1f1f3]">Apenas este episódio</p>
              <p className="text-xs text-[#5a5a72]">Mantém os anteriores como não assistidos</p>
            </div>
          </button>

          <button
            onClick={onFechar}
            className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-[#5a5a72] transition-colors hover:text-[#9898ac]"
          >
            <X size={15} aria-hidden="true" />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
