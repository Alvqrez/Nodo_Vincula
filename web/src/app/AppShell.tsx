/** Enmarca las pantallas autenticadas con navegación, encabezado y perfil. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CaretDown, DotsThreeOutline, MagnifyingGlass, SignOut, UserCircle, X } from '@phosphor-icons/react'
import { Lockup, NodoMark } from '@/components/brand'
import { ThemeToggle } from '@/components/ui'
import { Sheet } from '@/components/app'
import { MENU, MOVIL, type NavItem } from './nav'
import { useNotificaciones } from '@/lib/notificaciones'
import { useFoto } from '@/lib/fotos'
import { useModoNav } from '@/lib/preferencias'
import { ROL_LABEL, iniciales, nombreCompleto, useSession, useUsuario } from '@/lib/session'
import { useDialog } from '@/lib/dialog'

const activo = (item: { to: string }, path: string) => (item.to === '/app' ? path === '/app' : path === item.to || path.startsWith(`${item.to}/`))

function Avatar({ size = 36 }: { size?: number }) {
  const u = useUsuario()
  const foto = useFoto(u.id)
  const n = nombreCompleto(u)
  return foto
    ? <img src={foto} alt="" className="shrink-0 rounded-[8px] object-cover" style={{ width: size, height: size }} />
    : <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-[8px] bg-ink font-mono text-[13.5px] font-semibold text-ground" style={{ width: size, height: size }}>{iniciales(n)}</span>
}

/** Menú de la cuenta: perfil, apariencia, cerrar sesión. `arriba` lo abre hacia arriba (menú lateral). */
function MenuCuenta({ abierto, arriba, onCerrarSesion }: { abierto: boolean; arriba?: boolean; onCerrarSesion: () => void }) {
  return (
    <AnimatePresence>
      {abierto && (
        <motion.div role="menu" initial={{ opacity: 0, y: arriba ? 6 : -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: arriba ? 6 : -6 }} transition={{ duration: 0.16 }}
          className={`glass absolute z-40 grid min-w-[240px] rounded-[12px] p-1.5 ${arriba ? 'bottom-full left-3 right-3 mb-2' : 'right-0 top-full mt-2'}`}>
          <Link role="menuitem" to="/app/perfil" className="flex min-h-11 items-center gap-2.5 rounded-[8px] px-3 text-[15.5px] hover:bg-ink/5"><UserCircle size={18} aria-hidden="true" />Mi perfil</Link>
          <div className="flex min-h-11 items-center justify-between gap-2.5 px-3 text-[15.5px]"><span>Apariencia</span><ThemeToggle /></div>
          <button role="menuitem" type="button" onClick={onCerrarSesion} className="flex min-h-11 items-center gap-2.5 rounded-[8px] px-3 text-left text-[15.5px] text-bad hover:bg-bad/5"><SignOut size={18} aria-hidden="true" />Cerrar sesión</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const u = useUsuario()
  const { salir } = useSession()
  const { confirm } = useDialog()
  const { noLeidas } = useNotificaciones()
  const modo = useModoNav()
  const superior = modo === 'superior'
  const { pathname } = useLocation()
  const nav = useNavigate()
  const menu = MENU[u.rol]
  const [mas, setMas] = useState(false)
  const [buscar, setBuscar] = useState(false)
  const [cuenta, setCuenta] = useState(false)
  const [grupo, setGrupo] = useState(() => pathname.startsWith('/app/reportes'))
  const cuentaRef = useRef<HTMLDivElement>(null)
  const actual = menu.find((i) => activo(i, pathname))
  useEffect(() => { setMas(false); setCuenta(false) }, [pathname])
  useEffect(() => { if (pathname.startsWith('/app/reportes')) setGrupo(true) }, [pathname])

  // Ctrl/Cmd + K abre el buscador de secciones
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setBuscar(true) } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  // El menú de la cuenta se cierra al hacer clic fuera o con Escape
  useEffect(() => {
    if (!cuenta) return
    const fuera = (e: MouseEvent) => { if (!cuentaRef.current?.contains(e.target as Node)) setCuenta(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setCuenta(false) }
    document.addEventListener('mousedown', fuera); window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); window.removeEventListener('keydown', esc) }
  }, [cuenta])

  const cerrarSesion = async () => {
    setCuenta(false)
    if (await confirm({ title: 'Cerrar sesión', message: 'Tendrás que volver a entrar con tu cuenta.', confirmLabel: 'Cerrar sesión' })) { salir(); nav('/acceso') }
  }

  const movil = MOVIL[u.rol].map((to) => menu.find((i) => i.to === to)!).filter(Boolean)
  const badge = (i: NavItem) => (i.avisos && noLeidas > 0 ? noLeidas : 0)
  // En modo superior, los íconos caben desde 1024 px; por debajo se usa la barra inferior.
  const escritorio = superior ? 'lg' : 'md'

  return (
    <div className={`page-in mx-auto grid min-h-[100dvh] max-w-[1600px] ${superior ? '' : 'md:grid-cols-[248px_1fr]'}`}>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-ground">Saltar al contenido</a>

      {/* ── Menú lateral (modo lateral) ── */}
      {!superior && (
        <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-rule bg-tray md:flex" aria-label="Navegación">
          <Link to="/app" className="px-5 pb-5 pt-6" aria-label="Inicio de NODO Vincula"><Lockup size="sm" /></Link>
          <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label={`Menú de ${ROL_LABEL[u.rol]}`}>
            <ul className="grid gap-0.5">
              {menu.map((it) => {
                const on = activo(it, pathname)
                const I = it.icon
                const cls = `relative flex min-h-11 w-full items-center gap-3 rounded-[10px] pl-3.5 pr-3 text-left text-[15.5px] transition-colors ${on ? 'bg-raised font-semibold text-ink shadow-[0_1px_2px_rgb(80_30_5/.10),0_0_0_1px_var(--color-rule)]' : 'text-ink-2 hover:bg-ink/[.04] hover:text-ink'}`
                const inner = (
                  <>
                    {on && <span aria-hidden="true" className="absolute inset-y-3 left-1.5 w-[3px] rounded-full bg-signal" />}
                    <I size={18} weight={on ? 'regular' : 'light'} aria-hidden="true" />
                    <span className="flex-1">{it.label}</span>
                    {badge(it) > 0 && <span className="min-w-5 rounded-[4px] bg-signal px-1 text-center font-mono text-[12.5px] font-semibold text-on-signal">{badge(it)}</span>}
                    {it.children && <CaretDown size={14} aria-hidden="true" className={`transition-transform ${grupo ? '' : '-rotate-90'}`} />}
                  </>
                )
                return (
                  <li key={it.to}>
                    {it.children
                      ? <button type="button" aria-expanded={grupo} onClick={() => setGrupo((g) => !g)} className={cls}>{inner}</button>
                      : <NavLink to={it.to} end={it.to === '/app'} className={cls}>{inner}</NavLink>}
                    {it.children && grupo && (
                      <ul className="ml-9 grid border-l border-rule">
                        {it.children.map((c) => (
                          <li key={c.to}>
                            <NavLink to={c.to} className={({ isActive }) => `flex min-h-10 items-center rounded-[8px] pl-4 text-[15px] ${isActive ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink'}`}>{c.label}</NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
          <div ref={!superior ? cuentaRef : undefined} className="relative border-t border-rule">
            <button type="button" onClick={() => setCuenta((c) => !c)} aria-expanded={cuenta} aria-haspopup="menu"
              className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-ink/[.03]">
              <Avatar />
              <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{nombreCompleto(u)}</span><span className="block text-[13.5px] text-ink-3">{ROL_LABEL[u.rol]}</span></span>
              <CaretDown size={14} className={`text-ink-3 transition-transform ${cuenta ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <MenuCuenta abierto={cuenta} arriba onCerrarSesion={cerrarSesion} />
          </div>
        </aside>
      )}

      <div className={`flex min-w-0 flex-col bg-sheet pb-28 ${superior ? 'lg:pb-0' : 'md:pb-0'}`}>
        {/* ── Barra superior de vidrio ── */}
        <header className="glass sticky top-3 z-20 mx-3 mt-3 flex items-center gap-2 rounded-[14px] px-3 py-2 sm:mx-6 sm:px-4">
          {/* Celular (y tableta en modo superior): marca + título de la sección */}
          <Link to="/app" className={escritorio === 'lg' ? 'lg:hidden' : 'md:hidden'} aria-label="Inicio"><NodoMark size={24} /></Link>
          <p className={`font-display text-lg font-semibold tracking-[-.02em] ${escritorio === 'lg' ? 'lg:hidden' : 'md:hidden'}`}>{actual?.label ?? 'NODO Vincula'}</p>

          {superior ? (
            <>
              {/* Modo superior: marca + íconos que despliegan su nombre */}
              <Link to="/app" aria-label="Inicio de NODO Vincula" className="mr-2 hidden shrink-0 items-center lg:flex">
                <span className="xl:hidden"><NodoMark size={26} /></span>
                <span className="hidden xl:inline-flex"><Lockup size="sm" /></span>
              </Link>
              <NavSuperior menu={menu} pathname={pathname} badge={badge} />
            </>
          ) : (
            <button type="button" onClick={() => setBuscar(true)}
              className="hidden min-h-10 w-full max-w-[360px] items-center gap-2 rounded-[10px] border border-rule bg-ground/60 px-3 text-[15.5px] text-ink-3 hover:border-rule-strong md:flex">
              <MagnifyingGlass size={16} aria-hidden="true" className="shrink-0" /><span className="truncate">Ir a una sección</span>
              <kbd className="ml-auto shrink-0 whitespace-nowrap rounded-[4px] border border-rule px-1.5 font-mono text-[12.5px] text-ink-2">Ctrl K</kbd>
            </button>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button type="button" aria-label="Ir a una sección (Ctrl K)" title="Ir a una sección · Ctrl K" onClick={() => setBuscar(true)}
              className={`grid size-10 place-items-center rounded-[10px] text-ink-2 hover:bg-ink/5 hover:text-ink ${superior ? '' : 'md:hidden'}`}><MagnifyingGlass size={20} /></button>
            <span className="hidden sm:block"><ThemeToggle /></span>
            <Link to="/app/avisos" aria-label={`Avisos: ${noLeidas} sin leer`} className="relative grid size-10 place-items-center rounded-[10px] text-ink-2 hover:bg-ink/5 hover:text-ink">
              <Bell size={20} />
              {noLeidas > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-[4px] bg-signal px-0.5 text-center font-mono text-[12px] font-semibold leading-4 text-on-signal">{noLeidas > 99 ? '99+' : noLeidas}</span>}
            </Link>
            {superior && (
              <div ref={cuentaRef} className="relative hidden lg:block">
                <button type="button" onClick={() => setCuenta((c) => !c)} aria-expanded={cuenta} aria-haspopup="menu" aria-label={`Cuenta de ${nombreCompleto(u)}`}
                  className="ml-1 flex items-center gap-1.5 rounded-[10px] p-1 hover:bg-ink/5">
                  <Avatar size={32} /><CaretDown size={13} aria-hidden="true" className={`text-ink-3 transition-transform ${cuenta ? 'rotate-180' : ''}`} />
                </button>
                <MenuCuenta abierto={cuenta} onCerrarSesion={cerrarSesion} />
              </div>
            )}
          </div>
        </header>

        <main id="contenido" className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</main>
      </div>

      {/* ── Celular: barra inferior de vidrio por rol + hoja "Más" ── */}
      <nav aria-label="Navegación principal" className={`glass fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+10px)] z-30 grid grid-cols-5 rounded-[16px] ${superior ? 'lg:hidden' : 'md:hidden'}`}>
        {movil.map((it) => {
          const on = activo(it, pathname)
          const I = it.icon
          return (
            <Link key={it.to} to={it.children ? it.children[0].to : it.to} aria-current={on ? 'page' : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12.5px] ${on ? 'font-semibold text-ink' : 'text-ink-2'}`}>
              {on && <span aria-hidden="true" className="absolute left-1/2 top-1 h-[3px] w-6 -translate-x-1/2 rounded-full bg-signal" />}
              <I size={20} weight={on ? 'regular' : 'light'} aria-hidden="true" />{it.label}
              {badge(it) > 0 && <span className="absolute right-[22%] top-1.5 min-w-4 rounded-[4px] bg-signal px-0.5 font-mono text-[12px] leading-4 text-on-signal">{badge(it)}</span>}
            </Link>
          )
        })}
        <button type="button" onClick={() => setMas(true)} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12.5px] text-ink-2">
          <DotsThreeOutline size={20} weight="light" aria-hidden="true" />Más
        </button>
      </nav>
      <Sheet open={mas} onClose={() => setMas(false)} title="Más secciones">
        <ul className="grid grid-cols-2 gap-px border border-rule bg-rule">
          {menu.filter((i) => !MOVIL[u.rol].includes(i.to)).flatMap((it) => (it.children ? it.children.map((c) => ({ ...it, to: c.to, label: `Reporte ${c.label.toLowerCase()}` })) : [it])).map((it) => {
            const I = it.icon
            return <li key={it.to}><Link to={it.to} className="flex min-h-14 items-center gap-2.5 bg-sheet px-3 text-[15.5px]"><I size={18} weight="light" aria-hidden="true" />{it.label}</Link></li>
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-rule pt-4">
          <span className="text-[15.5px] text-ink-2">Apariencia</span><ThemeToggle />
        </div>
        <button type="button" onClick={cerrarSesion} className="mt-3 flex min-h-12 w-full items-center gap-2.5 border border-bad/40 px-3 text-[15.5px] text-bad"><SignOut size={18} aria-hidden="true" />Cerrar sesión</button>
      </Sheet>

      <Buscador abierto={buscar} onClose={() => setBuscar(false)} menu={menu} />
    </div>
  )
}

/* ── Navegación superior: íconos que se iluminan y despliegan su nombre (hover, foco o sección activa) ── */
function NavSuperior({ menu, pathname, badge }: { menu: NavItem[]; pathname: string; badge: (i: NavItem) => number }) {
  const [sobre, setSobre] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const grupoRef = useRef<HTMLLIElement>(null)
  useEffect(() => setAbierto(null), [pathname])
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (!grupoRef.current?.contains(e.target as Node)) setAbierto(null) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(null) }
    document.addEventListener('mousedown', fuera); window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); window.removeEventListener('keydown', esc) }
  }, [abierto])

  return (
    <nav aria-label="Navegación principal" className="hidden min-w-0 lg:block">
      <ul className="flex items-center gap-0.5" onMouseLeave={() => setSobre(null)}>
        {menu.map((it) => {
          const on = activo(it, pathname)
          const visible = on || sobre === it.to || abierto === it.to
          const I = it.icon
          const n = badge(it)
          const cls = `relative flex h-10 items-center gap-2 overflow-hidden rounded-[10px] px-2.5 text-[15px] transition-colors duration-200
            ${on ? 'bg-raised font-semibold text-ink shadow-[0_1px_2px_rgb(80_30_5/.10),0_0_0_1px_var(--color-rule)]' : visible ? 'bg-ink/[.06] text-ink' : 'text-ink-2'}`
          const contenido = (
            <>
              <motion.span layout="position" className="relative grid place-items-center">
                <I size={20} weight={on ? 'regular' : 'light'} aria-hidden="true" />
                {n > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-[4px] bg-signal px-0.5 text-center font-mono text-[11px] font-semibold leading-4 text-on-signal">{n}</span>}
              </motion.span>
              <AnimatePresence initial={false}>
                {visible && (
                  <motion.span key="t" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }} className="whitespace-nowrap pr-0.5">
                    {it.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {on && <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-signal" />}
            </>
          )
          const comun = {
            onMouseEnter: () => setSobre(it.to), onFocus: () => setSobre(it.to), onBlur: () => setSobre(null),
            'aria-label': it.children ? undefined : `${it.label}${n ? `: ${n} sin leer` : ''}`,
          }
          return (
            <motion.li key={it.to} layout transition={{ type: 'spring', stiffness: 420, damping: 34 }} ref={it.children ? grupoRef : undefined} className="relative">
              {it.children ? (
                <>
                  <button type="button" {...comun} aria-label={it.label} aria-expanded={abierto === it.to} aria-haspopup="menu"
                    onClick={() => setAbierto((a) => (a === it.to ? null : it.to))} className={cls}>{contenido}</button>
                  <AnimatePresence>
                    {abierto === it.to && (
                      <motion.ul role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}
                        className="glass absolute left-0 top-full z-40 mt-2 grid min-w-[200px] rounded-[12px] p-1.5">
                        {it.children.map((c) => (
                          <li key={c.to}>
                            <NavLink role="menuitem" to={c.to} className={({ isActive }) => `flex min-h-11 items-center rounded-[8px] px-3 text-[15.5px] ${isActive ? 'bg-raised font-semibold' : 'hover:bg-ink/5'}`}>
                              Reporte {c.label.toLowerCase()}
                            </NavLink>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <NavLink to={it.to} end={it.to === '/app'} {...comun} className={cls}>{contenido}</NavLink>
              )}
            </motion.li>
          )
        })}
      </ul>
    </nav>
  )
}

/* ── Buscador de secciones (Ctrl+K) ── */
function Buscador({ abierto, onClose, menu }: { abierto: boolean; onClose: () => void; menu: NavItem[] }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const opciones = useMemo(() => {
    const todas = menu.flatMap((i) => (i.children ? i.children.map((c) => ({ to: c.to, label: `Reporte ${c.label.toLowerCase()}`, kw: i.keywords ?? '' })) : [{ to: i.to, label: i.label, kw: i.keywords ?? '' }]))
    const t = q.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    return t ? todas.filter((o) => `${o.label} ${o.kw}`.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(t)) : todas
  }, [menu, q])
  useEffect(() => { if (abierto) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30) } }, [abierto])
  useEffect(() => setSel(0), [q])
  const ir = (to: string) => { onClose(); nav(to) }
  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-[65] flex items-start justify-center bg-[rgb(5_6_8/.55)] px-4 pt-[12vh]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Ir a una sección" onClick={(e) => e.stopPropagation()} className="glass w-full max-w-[520px] overflow-hidden rounded-[14px]">
        <div className="flex items-center gap-3 border-b border-rule px-4">
          <MagnifyingGlass size={18} className="text-ink-3" aria-hidden="true" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ir a una sección…" aria-label="Buscar sección"
            role="combobox" aria-expanded="true" aria-controls="buscador-lista" aria-activedescendant={opciones[sel] ? `op-${sel}` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, opciones.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
              if (e.key === 'Enter' && opciones[sel]) ir(opciones[sel].to)
              if (e.key === 'Escape') onClose()
            }}
            className="min-h-14 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-3" />
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-9 place-items-center rounded-[8px] text-ink-3 hover:text-ink"><X size={16} /></button>
        </div>
        <ul id="buscador-lista" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
          {opciones.length === 0 && <li className="px-3 py-6 text-center text-[15.5px] text-ink-3">No hay secciones con “{q}”.</li>}
          {opciones.map((o, i) => (
            <li key={o.to} id={`op-${i}`} role="option" aria-selected={i === sel}>
              <button type="button" onMouseEnter={() => setSel(i)} onClick={() => ir(o.to)}
                className={`flex min-h-11 w-full items-center justify-between rounded-[8px] px-3 text-left text-[16.5px] ${i === sel ? 'bg-ink text-ground' : ''}`}>
                {o.label}<span className={`font-mono text-[12.5px] ${i === sel ? 'text-ground/70' : 'text-ink-3'}`}>{o.to.replace('/app', '') || '/'}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
