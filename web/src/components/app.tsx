/** Ofrece piezas compartidas para construir páginas, listas y estados de interfaz. */

/**
 * Sistema de componentes de la app interna (concepto B "Expediente").
 * Toda pantalla nueva se arma con estas piezas: no se inventan estilos por pantalla.
 */
import { useEffect, useId, type ComponentType, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WarningCircle, X, type IconProps } from '@phosphor-icons/react'
import { Seal, type Tone } from './ui'
import { Topo } from './carto'

/* ── Encabezado de página: ceja en mono, título, una frase con el estado real, acciones ── */
/**
 * `banda` = encabezado con el amanecer de NODO (solo Inicio). Sin banda, curvas de nivel tenues:
 * el mapa de NODO asomando detrás del expediente.
 */
export function PageHeader({ eyebrow, title, summary, actions, banda }: { eyebrow?: ReactNode; title: string; summary?: ReactNode; actions?: ReactNode; banda?: boolean }) {
  if (banda) {
    return (
      <header className="app-sunrise -mx-4 -mt-3 grid gap-4 px-4 pb-10 pt-12 sm:-mx-8 sm:px-8 lg:-mx-12 lg:-mt-5 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12 lg:pb-12 lg:pt-16">
        <Topo className="absolute inset-0 -z-10 h-full w-full text-[#F3EFE6]/[.13]" seed={11} rings={11} />
        <div className="grid gap-3">
          {eyebrow && <p className="font-mono text-[12.5px] uppercase tracking-[.1em] text-[#FFB48F]">{eyebrow}</p>}
          <h1 className="font-display text-[clamp(2.2rem,4.4vw,3.6rem)] font-semibold leading-[1] tracking-[-.045em] text-[#F3EFE6]">{title}</h1>
          {summary && <p className="max-w-[60ch] text-[17px] leading-relaxed text-[#F3EFE6]/85 [&_b]:text-[#F3EFE6] [&_span]:text-[#F3EFE6]">{summary}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    )
  }
  return (
    <header className="relative isolate grid gap-4 border-b border-rule pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
      <Topo className="absolute -top-10 right-0 -z-10 h-[calc(100%+40px)] w-[min(70%,760px)] text-ink/[.07] [mask-image:linear-gradient(to_left,#000_40%,transparent)]" seed={title.length * 13 + 5} />
      <div className="grid gap-2.5">
        {eyebrow && <p className="font-mono text-[12.5px] uppercase tracking-[.1em] text-signal-ink">{eyebrow}</p>}
        <h1 className="font-display text-[clamp(1.9rem,3.4vw,2.8rem)] font-semibold leading-[1.02] tracking-[-.04em]">{title}</h1>
        {summary && <p className="max-w-[64ch] text-[17px] leading-relaxed text-ink-2">{summary}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/* ── Control segmentado con fondo que se desliza (navegación: esquinas redondeadas) ── */
export function Segmented<T extends string>({ options, value, onChange, label, className = '' }:
  { options: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const grupo = useId()
  return (
    <div role="radiogroup" aria-label={label} className={`chip-row inline-flex gap-0.5 rounded-[12px] bg-tray p-1 shadow-[inset_0_0_0_1px_var(--color-rule)] sm:flex-nowrap ${className}`}>
      {options.map((o) => {
        const on = o.id === value
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.id)}
            className={`relative min-h-10 rounded-[9px] px-3.5 text-[15px] transition-colors ${on ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink'}`}>
            {on && <motion.span layoutId={`seg-${grupo}`} transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="absolute inset-0 rounded-[9px] bg-raised shadow-[0_1px_2px_rgb(80_30_5/.12),0_0_0_1px_var(--color-rule)]" />}
            <span className="relative z-10 flex items-center gap-2">{o.label}
              {o.count !== undefined && <span className="font-mono text-[13px] text-ink-3">{o.count}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Sección: se agrupa con línea y espacio, no con tarjetas (design-taste v1, regla 4) ── */
export function Section({ title, aside, children, className = '' }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    // Cada parte de la pantalla es una hoja propia del expediente: borde, fondo elevado y título legible.
    // Placa dentro de bandeja (doble bisel): la hoja se lee como objeto propio, con profundidad.
    <section aria-labelledby={id} className={`sheet-bezel min-w-0 ${className}`}>
      <div className="sheet-core tick grid h-full min-w-0 content-start gap-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-rule pb-3">
          <h2 id={id} className="font-display text-[19px] font-semibold tracking-[-.015em] text-ink">{title}</h2>
          {aside}
        </div>
        {children}
      </div>
    </section>
  )
}

/* ── Estados ── */
export function EmptyState({ icon: I, title, children, action }: { icon?: ComponentType<IconProps>; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-3 border border-dashed border-rule-strong p-7">
      {I && <I size={26} weight="light" className="text-ink-3" aria-hidden="true" />}
      <p className="font-medium">{title}</p>
      {children && <p className="max-w-[52ch] text-[15.5px] leading-relaxed text-ink-2">{children}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 border border-bad/40 bg-bad/5 p-4 text-[15.5px]">
      <WarningCircle size={20} className="text-bad" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry && <button type="button" onClick={onRetry} className="min-h-10 border border-rule-strong px-3 text-ink hover:bg-ink/5">Reintentar</button>}
    </div>
  )
}

/** Esqueleto con la forma real del contenido (sin indicadores giratorios). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />
}
export function SkeletonRows({ rows = 4, label = 'Cargando' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_6rem] items-center gap-4 py-2"><Skeleton className="h-3" /><Skeleton className="h-4" /><Skeleton className="h-5" /></div>
      ))}
    </div>
  )
}

/* ── Formularios: etiqueta arriba, ayuda opcional, error abajo (design-taste v1, regla 6) ── */
const control = 'min-h-11 w-full border bg-sheet px-3.5 text-[16.5px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink disabled:opacity-60'
export function Field({ label, help, error, children, htmlFor }: { label: string; help?: ReactNode; error?: string | null; children: ReactNode; htmlFor: string }) {
  return (
    <div className="grid gap-2">
      <label htmlFor={htmlFor} className="text-[15.5px] font-medium text-ink">{label}</label>
      {children}
      {error ? <p id={`${htmlFor}-err`} role="alert" className="text-[14.5px] text-bad">{error}</p>
        : help ? <p id={`${htmlFor}-help`} className="text-[14px] text-ink-3">{help}</p> : null}
    </div>
  )
}
export function TextInput({ invalid, className = '', ...p }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} {...p} className={`${control} ${invalid ? 'border-bad' : 'border-rule-strong'} ${className}`} />
}
export function TextArea({ invalid, className = '', ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} {...p} className={`${control} py-3 leading-relaxed ${invalid ? 'border-bad' : 'border-rule-strong'} ${className}`} />
}
export function SelectInput({ invalid, className = '', children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select aria-invalid={invalid || undefined} {...p} className={`${control} ${invalid ? 'border-bad' : 'border-rule-strong'} ${className}`}>{children}</select>
}

/* ── Botones de acción compactos dentro de listas ── */
export function MiniButton({ children, onClick, variant = 'ink', disabled, type = 'button', ...rest }:
  { children: ReactNode; onClick?: () => void; variant?: 'ink' | 'ghost' | 'danger'; disabled?: boolean; type?: 'button' | 'submit'; 'aria-label'?: string }) {
  const v = { ink: 'bg-ink text-ground hover:bg-ink/90', ghost: 'border border-rule-strong text-ink hover:bg-ink/5', danger: 'border border-bad/50 text-bad hover:bg-bad/5' }[variant]
  return (
    <button type={type} onClick={onClick} disabled={disabled} {...rest}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-3.5 text-[15.5px] font-medium transition-colors active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${v}`}>
      {children}
    </button>
  )
}

/* ── Hoja / diálogo: sube desde abajo en celular, centrado en escritorio (patrón NODO) ── */
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.documentElement.style.overflow = prev }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgb(5_6_8/.6)] sm:items-center sm:p-6" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
            className={`tick max-h-[90dvh] w-full overflow-y-auto border border-rule bg-sheet p-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] sm:p-7 ${wide ? 'sm:max-w-[680px]' : 'sm:max-w-[480px]'}`}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="font-display text-xl font-semibold tracking-[-.02em]">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="-mr-2 -mt-2 grid size-11 place-items-center text-ink-2 hover:text-ink"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Estados de reporte: un solo vocabulario para toda la app ── */
export type EstadoReporte = 'aceptado' | 'revision' | 'corregir' | 'pendiente' | 'bloqueado'
export const ESTADO_REPORTE: Record<EstadoReporte, { label: string; tone: Tone; help: string }> = {
  aceptado: { label: 'Aceptado', tone: 'ok', help: 'Tu asesor lo aprobó.' },
  revision: { label: 'En revisión', tone: 'signal', help: 'Entregado; tu asesor lo está revisando.' },
  corregir: { label: 'Por corregir', tone: 'bad', help: 'Tu asesor pidió cambios.' },
  pendiente: { label: 'Pendiente', tone: 'warn', help: 'Abierto; aún no lo entregas.' },
  bloqueado: { label: 'Bloqueado', tone: 'neutral', help: 'Se abre al aceptar el anterior.' },
}
export function ReportSeal({ estado, stamped, delay }: { estado: EstadoReporte; stamped?: boolean; delay?: number }) {
  const e = ESTADO_REPORTE[estado]
  return <Seal tone={e.tone} stamped={stamped} delay={delay}>{e.label}</Seal>
}
export const CELDA_REPORTE: Record<EstadoReporte, string> = { aceptado: 'bg-ok', revision: 'bg-signal', corregir: 'bg-bad', pendiente: 'bg-warn', bloqueado: 'bg-ink/10' }

/** Ruta de 5 puntos por residente (Preliminar → Final). */
export function MiniRoute({ ruta, label }: { ruta: EstadoReporte[]; label: string }) {
  const nombres = ['Preliminar', 'Parcial 1', 'Parcial 2', 'Parcial 3', 'Final']
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`${label}: ${ruta.map((e, i) => `${nombres[i]} ${ESTADO_REPORTE[e].label}`).join(', ')}`}>
      {ruta.map((e, i) => <span key={i} className={`h-2 w-5 ${CELDA_REPORTE[e]}`} />)}
    </span>
  )
}

/** Fecha corta en mono: "15 may 2026". Acepta ISO o fechas ya formateadas por el backend. */
export function fechaCorta(v: string | null | undefined) {
  if (!v) return null
  const iso = /^\d{4}-\d{2}-\d{2}/.test(v)
  if (!iso) return v
  const [y, m, d] = v.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
}
