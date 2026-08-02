import { useCallback, useRef } from 'react'

interface Options {
  delay?: number       // ms para acionar (default 500)
  onLongPress: () => void
  onClick?: () => void
}

// Retorna os event handlers para aplicar num elemento
// Funciona com touch (mobile) e mouse (desktop)
export function useLongPress({ delay = 500, onLongPress, onClick }: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)

  const start = useCallback(() => {
    firedRef.current = false
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onLongPress()
    }, delay)
  }, [delay, onLongPress])

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const end = useCallback(() => {
    cancel()
    if (!firedRef.current && onClick) onClick()
  }, [cancel, onClick])

  return {
    onMouseDown:   start,
    onMouseUp:     end,
    onMouseLeave:  cancel,
    onTouchStart:  start,
    onTouchEnd:    end,
    onTouchCancel: cancel,
    // evita o menu de contexto nativo no mobile ao segurar
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault() },
  }
}
