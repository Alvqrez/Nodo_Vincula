import {
  useEffect, useId, useRef, useState,
  type ComponentType, type CSSProperties, type KeyboardEvent, type ReactNode,
} from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { ArrowUpRight, Check, Copy, Desktop, Moon, Sun, type IconProps } from '@phosphor-icons/react'
import { useTheme, type ThemeChoice } from '@/theme'

type Icon = ComponentType<IconProps>

/* ─────────────────────────────────────────────────────────────────────────────
   Botón dentro de botón (high-end-visual-design §4B): el ícono final vive en su
   propio pozo cuadrado (geometría NODO, no píldora). Presión física al activar.
   ───────────────────────────────────────────────────────────────────────────── */
type Variant = 'ink' | 'signal' | 'ghost'
const VARIANT: Record<Variant, { base: string; well: string }> = {
  ink: { base: 'bg-ink text-ground hover:bg-ink/90', well: 'bg-ground/12 text-ground' },
  signal: { base: 'bg-signal text-on-signal hover:bg-signal-hover', well: 'bg-on-signal text-signal' },
  ghost: { base: 'border border-rule-strong text-ink hover:bg-ink/5', well: 'bg-ink/8 text-ink' },
}

export function Button({
  children, href, onClick, variant = 'ink', icon: IconCmp = ArrowUpRight, noIcon, className = '', type = 'button', ...rest
}: {
  children: ReactNode; href?: string; onClick?: () => void; variant?: Variant; icon?: Icon; noIcon?: boolean
  className?: string; type?: 'button' | 'submit'; 'aria-label'?: string; target?: string; rel?: string; disabled?: boolean
}) {
  const v = VARIANT[variant]
  const cls = `group inline-flex min-h-11 select-none items-center gap-3 rounded-[var(--radius-sm)] text-[15px] font-medium
    transition-[background-color,transform] duration-300 ease-[var(--ease-nodo)] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50
    ${noIcon ? 'px-5' : 'py-1.5 pl-5 pr-1.5'} ${v.base} ${className}`
  const inner = (
    <>
      <span>{children}</span>
      {!noIcon && (
        <span aria-hidden="true" className={`grid size-8 place-items-center rounded-[2px] transition-transform duration-300 ease-[var(--ease-nodo)]
          group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105 ${v.well}`}>
          <IconCmp size={16} weight="regular" />
        </span>
      )}
    </>
  )
  if (href) return <a href={href} className={cls} {...rest}>{inner}</a>
  return <button type={type} onClick={onClick} className={cls} {...rest}>{inner}</button>
}

/** Atracción magnética leve hacia el cursor (design-taste v1 §4, MOTION > 5).
 *  Fuera del ciclo de render de React: motion values, sin useState. */
export function Magnetic({ children, strength = 0.22 }: { children: ReactNode; strength?: number }) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0), y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 150, damping: 15, mass: 0.2 })
  const sy = useSpring(y, { stiffness: 150, damping: 15, mass: 0.2 })
  if (reduce) return <>{children}</>
  return (
    <motion.span
      className="inline-block"
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => { x.set(0); y.set(0) }}
    >
      {children}
    </motion.span>
  )
}

/* ── Sello de estado: el sello de goma del expediente, en mono ── */
export type Tone = 'ok' | 'warn' | 'bad' | 'signal' | 'neutral'
const TONE: Record<Tone, string> = {
  ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', signal: 'text-signal-ink', neutral: 'text-ink-3',
}
export function Seal({ children, tone = 'neutral', stamped, delay = 0, className = '' }:
  { children: ReactNode; tone?: Tone; stamped?: boolean; delay?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 -rotate-2 items-center border-[1.5px] border-current px-1.5 py-[3px] font-mono text-[10.5px] font-semibold uppercase leading-none tracking-[.12em] ${TONE[tone]} ${stamped ? 'stamp' : ''} ${className}`}
      style={stamped ? ({ '--d': `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </span>
  )
}

/* ── Ceja: pestaña de expediente con marcador de señal ── */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`folder-tab inline-flex items-center gap-2 bg-tray py-1.5 pl-3 pr-5 font-mono text-[11px] font-medium uppercase tracking-[.18em] text-ink-2 ${className}`}>
      <span aria-hidden="true" className="size-[7px] bg-signal" />
      {children}
    </p>
  )
}

/* ── Doble bisel (high-end §4A): placa (hoja) dentro de una bandeja, radios concéntricos 10 → 4 ── */
export function Bezel({ children, className = '', innerClassName = '' }: { children: ReactNode; className?: string; innerClassName?: string }) {
  return (
    <div className={`rounded-[10px] bg-tray p-1.5 ring-1 ring-rule ${className}`}>
      <div className={`rounded-[4px] bg-sheet shadow-[inset_0_1px_0_rgb(255_255_255/.65)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/.04)] ${innerClassName}`}>
        {children}
      </div>
    </div>
  )
}

/* ── Pestañas de carpeta accesibles (flechas izquierda/derecha) ── */
export function FolderTabs<T extends string>({ tabs, value, onChange, label, className = '' }:
  { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string; className?: string }) {
  const base = useId()
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = tabs.findIndex((t) => t.id === value)
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    onChange(n.id)
    document.getElementById(`${base}-${n.id}`)?.focus()
  }
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className={`flex gap-1 ${className}`}>
      {tabs.map((t) => {
        const on = t.id === value
        return (
          <button key={t.id} id={`${base}-${t.id}`} role="tab" type="button" aria-selected={on} tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`folder-tab relative min-h-11 px-4 pr-6 text-sm transition-colors duration-200
              ${on ? 'z-10 -mb-px bg-sheet font-semibold text-ink' : 'bg-tray text-ink-2 hover:text-ink'}`}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Tema: botón rápido y selector de tres posiciones ── */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button type="button" onClick={toggle} aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`grid size-10 place-items-center rounded-[var(--radius-sm)] border border-rule text-ink-2 transition-colors hover:border-rule-strong hover:text-ink ${className}`}>
      {dark ? <Sun size={18} weight="regular" /> : <Moon size={18} weight="regular" />}
    </button>
  )
}

export function ThemeSegmented({ className = '' }: { className?: string }) {
  const { choice, setChoice } = useTheme()
  const opts: { id: ThemeChoice; label: string; icon: Icon }[] = [
    { id: 'system', label: 'Sistema', icon: Desktop }, { id: 'light', label: 'Claro', icon: Sun }, { id: 'dark', label: 'Oscuro', icon: Moon },
  ]
  return (
    <div role="radiogroup" aria-label="Apariencia" className={`inline-flex border border-rule p-0.5 ${className}`}>
      {opts.map(({ id, label, icon: I }) => (
        <button key={id} type="button" role="radio" aria-checked={choice === id} onClick={() => setChoice(id)}
          className={`inline-flex min-h-9 items-center gap-1.5 px-3 text-xs transition-colors ${choice === id ? 'bg-ink text-ground' : 'text-ink-2 hover:text-ink'}`}>
          <I size={14} weight="regular" />{label}
        </button>
      ))}
    </div>
  )
}

/* ── Revelado al entrar en pantalla (IntersectionObserver, nunca scroll listeners) ── */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }:
  { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'section' | 'li' | 'article' }) {
  const ref = useRef<HTMLElement | null>(null)
  const [inView, setIn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIn(true); io.disconnect() } }, { rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref as never} className={`reveal ${inView ? 'is-in' : ''} ${className}`} style={{ '--d': `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  )
}

/** Titular que entra palabra por palabra desde una máscara (referencia tasteskill.dev). */
export function Words({ text, className = '' }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i}>
          <span className="word-mask"><span style={{ '--i': i } as CSSProperties}>{w}</span></span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

/** Copia un texto (p. ej. el correo de soporte) y confirma en el mismo botón. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" aria-label={`Copiar ${label}`}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800) } catch { /* sin portapapeles */ }
      }}
      className="inline-flex min-h-9 items-center gap-1.5 border border-rule px-2.5 text-xs text-ink-2 transition-colors hover:border-rule-strong hover:text-ink">
      {done ? <Check size={14} /> : <Copy size={14} />}{done ? 'Copiado' : 'Copiar'}
    </button>
  )
}
