/** Reúne piezas reutilizadas por las pantallas compartidas. */

/**
 * Piezas pequeñas que comparten Avisos, Calendario y Perfil y que aún no existen
 * en el sistema común (components/app.tsx). Misma geometría NODO: cuadrados, 4 px.
 */
import { useState, type ComponentType, type ReactNode } from 'react'
import { Check, Copy, type IconProps } from '@phosphor-icons/react'

/** Botón de solo ícono: 44 × 44, etiqueta accesible obligatoria. */
export function IconButton({ icon: I, label, onClick, tone = 'ink', disabled, className = '' }:
  { icon: ComponentType<IconProps>; label: string; onClick?: () => void; tone?: 'ink' | 'danger'; disabled?: boolean; className?: string }) {
  const t = tone === 'danger' ? 'text-ink-3 hover:bg-bad/5 hover:text-bad' : 'text-ink-2 hover:bg-ink/5 hover:text-ink'
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={`grid size-11 shrink-0 place-items-center transition-[background-color,color,transform] duration-200 active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-40 ${t} ${className}`}>
      <I size={18} aria-hidden="true" />
    </button>
  )
}

/** Acción compacta dentro de una fila (como MiniButton, pero con blanco táctil de 44 px). */
export function Accion({ children, onClick, variant = 'ghost', disabled, icon: I, label }:
  { children: ReactNode; onClick?: () => void; variant?: 'ink' | 'ghost' | 'danger'; disabled?: boolean; icon?: ComponentType<IconProps>; label?: string }) {
  const v = { ink: 'bg-ink text-ground hover:bg-ink/90', ghost: 'border border-rule-strong text-ink hover:bg-ink/5', danger: 'border border-bad/50 text-bad hover:bg-bad/5' }[variant]
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-3.5 text-[15.5px] font-medium transition-[background-color,transform] duration-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${v}`}>
      {I && <I size={16} aria-hidden="true" />}{children}
    </button>
  )
}

/** Grupo de opciones como fichas cuadradas (radio accesible). */
export function ChipRadio<T extends string>({ label, options, value, onChange, className = '', desliza }:
  { label: string; options: { id: T; label: ReactNode; icon?: ComponentType<IconProps> }[]; value: T; onChange: (v: T) => void; className?: string; desliza?: boolean }) {
  // desliza: en celular, una sola fila que se desliza dentro de su contenedor (patrón .chip-row)
  return (
    <div role="radiogroup" aria-label={label} className={`${desliza ? 'chip-row !gap-1.5' : 'flex flex-wrap gap-1.5'} ${className}`}
      onKeyDown={(e) => {
        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return
        e.preventDefault()
        const i = options.findIndex((o) => o.id === value)
        const n = options[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length]
        onChange(n.id)
        ;(e.currentTarget.querySelector(`[data-id="${CSS.escape(n.id)}"]`) as HTMLElement | null)?.focus()
      }}>
      {options.map(({ id, label: l, icon: I }) => {
        const on = id === value
        return (
          <button key={id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} data-id={id} onClick={() => onChange(id)}
            className={`inline-flex min-h-11 items-center gap-2 border px-3.5 text-[15.5px] transition-[background-color,border-color,color,transform] duration-200 active:scale-[.98]
              ${on ? 'border-ink bg-ink font-medium text-ground' : 'border-rule-strong text-ink-2 hover:border-ink hover:text-ink'}`}>
            {I && <I size={16} aria-hidden="true" />}{l}
          </button>
        )
      })}
    </div>
  )
}

/** Lista de datos en dos columnas (etiqueta en mono, valor en texto). */
export function Datos({ items }: { items: { k: string; v: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-rule border-y border-rule">
      {items.map(({ k, v }) => (
        <div key={k} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
          <dt className="font-mono text-[12.5px] uppercase tracking-[.1em] text-ink-3 sm:pt-0.5">{k}</dt>
          <dd className="min-w-0 break-words text-[16.5px] text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Copiar al portapapeles con confirmación en el mismo botón (blanco táctil de 44 px). */
export function Copiar({ text, label }: { text: string; label: string }) {
  const [hecho, setHecho] = useState(false)
  return (
    <button type="button" aria-label={hecho ? 'Copiado' : `Copiar ${label}`}
      onClick={async () => { try { await navigator.clipboard.writeText(text); setHecho(true); setTimeout(() => setHecho(false), 1800) } catch { /* sin portapapeles */ } }}
      className="inline-flex min-h-11 items-center gap-1.5 border border-rule px-3 text-[13.5px] text-ink-2 transition-[border-color,color,transform] hover:border-rule-strong hover:text-ink active:scale-[.97]">
      {hecho ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{hecho ? 'Copiado' : 'Copiar'}
    </button>
  )
}
