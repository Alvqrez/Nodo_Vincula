import type { CSSProperties } from 'react'

/** Símbolo NODO sin modificar: punto + anillo abierto (la conexión posible). */
export function NodoMark({ size = 28, animated = false, className = '' }: { size?: number; animated?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="10" fill="none" stroke="#FF5A1F" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray="46 17" transform="rotate(-50 16 16)" className={animated ? 'draw' : undefined}
        style={animated ? ({ '--len': 63 } as CSSProperties) : undefined} />
      <circle cx="16" cy="16" r="3.5" fill="currentColor" />
    </svg>
  )
}

/** Firma "NODO Vincula": el símbolo NODO + el descriptor de la app. */
export function Lockup({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: { mark: 22, text: 'text-base' }, md: { mark: 28, text: 'text-xl' }, lg: { mark: 44, text: 'text-4xl' } }[size]
  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold tracking-tight text-ink ${s.text} ${className}`}>
      <NodoMark size={s.mark} />
      <span>NODO</span>
      <span className="font-medium text-ink-2">Vincula</span>
    </span>
  )
}
