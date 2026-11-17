import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Lockup } from '@/components/brand'
import { Button, ThemeToggle } from '@/components/ui'
import { SITE } from '@/content'

export const LINKS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#para-quien', label: 'Para quién' },
  { href: '#que-incluye', label: 'Qué incluye' },
  { href: '#preguntas', label: 'Preguntas' },
]

/** Isla de navegación flotante, separada del borde (high-end §5A). Vidrio solo porque es fija. */
export default function Nav() {
  const [open, setOpen] = useState(false)
  const firstLink = useRef<HTMLAnchorElement>(null)
  const burger = useRef<HTMLButtonElement>(null)
  const overlay = useRef<HTMLDivElement>(null)

  // Cerrado, el menú no recibe foco ni clics (inert no está tipado en React 18).
  useEffect(() => { if (overlay.current) overlay.current.inert = !open }, [open])

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    firstLink.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); burger.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => { root.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-4">
        <nav aria-label="Principal"
          className="flex w-full max-w-[1120px] items-center gap-2 rounded-[10px] bg-sheet/92 py-1.5 pl-3 pr-1.5 shadow-paper backdrop-blur-xl sm:pl-4">
          <a href="#inicio" aria-label="NODO Vincula, inicio" className="mr-auto flex min-h-11 items-center"><Lockup size="sm" /></a>
          <ul className="hidden items-center md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="inline-flex min-h-11 items-center px-3 text-sm text-ink-2 transition-colors hover:text-ink">{l.label}</a>
              </li>
            ))}
          </ul>
          <ThemeToggle />
          <span className="hidden sm:inline-flex"><Button href={SITE.appUrl}>Entrar</Button></span>
          <button ref={burger} type="button" aria-expanded={open} aria-controls="menu-movil" aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((o) => !o)}
            className="burger relative grid size-11 place-items-center rounded-[var(--radius-sm)] text-ink md:hidden">
            <span aria-hidden="true" /><span aria-hidden="true" />
          </button>
        </nav>
      </header>

      {/* Menú móvil: capa de vidrio a pantalla completa con revelado escalonado */}
      <div id="menu-movil" ref={overlay} className={`menu-overlay fixed inset-0 z-30 bg-ground/85 backdrop-blur-3xl md:hidden ${open ? 'menu-open' : ''}`}
        aria-hidden={!open}>
        <nav aria-label="Menú" className="flex min-h-[100dvh] flex-col justify-between px-6 pb-[calc(env(safe-area-inset-bottom,0px)+32px)] pt-32">
          <ul className="grid gap-2">
            {LINKS.map((l, i) => (
              <li key={l.href}>
                <a ref={i === 0 ? firstLink : undefined} href={l.href} onClick={() => setOpen(false)}
                  className="menu-link py-1 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-[-.035em] text-ink"
                  style={{ '--i': i } as CSSProperties}>
                  <span>{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="menu-link" style={{ '--i': LINKS.length } as CSSProperties}>
            <span><Button href={SITE.appUrl} variant="signal">Entrar a NODO Vincula</Button></span>
          </div>
        </nav>
      </div>
    </>
  )
}
