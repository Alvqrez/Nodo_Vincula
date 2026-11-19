import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, Briefcase, Buildings, CalendarBlank, CaretDown, ChartBar, Checks, DotsThreeOutline, Eye, EyeSlash,
  FileText, Folder, GithubLogo, House, MagnifyingGlass, Signature, UserCircle, UserPlus, Users, X, type IconProps,
} from '@phosphor-icons/react'
import { Lockup, NodoMark } from '@/components/brand'
import { Button, CopyButton, Seal, ThemeToggle } from '@/components/ui'
import { SITE } from '@/content'
import { InicioAsesor, InicioResidente, InicioVinculacion } from './Roles'
import './prototipo.css'

type Icon = ComponentType<IconProps>

export default function Prototipo() {
  return (
    <div className="page-in min-h-[100dvh]">
      <ProtoBar />
      <Routes>
        <Route index element={<Acceso />} />
        <Route path="residente" element={<AppFrame rol="residente"><InicioResidente /></AppFrame>} />
        <Route path="asesor" element={<AppFrame rol="asesor"><InicioAsesor /></AppFrame>} />
        <Route path="jefe" element={<AppFrame rol="jefe"><InicioVinculacion /></AppFrame>} />
        <Route path="*" element={<Navigate to="/prototipo" replace />} />
      </Routes>
    </div>
  )
}

/* ── Barra del prototipo: NO es parte de la app ── */
function ProtoBar() {
  const tabs = [
    { to: '/prototipo', label: 'Acceso', end: true },
    { to: '/prototipo/residente', label: 'Residente' },
    { to: '/prototipo/asesor', label: 'Asesor' },
    { to: '/prototipo/jefe', label: 'Vinculación' },
  ]
  return (
    <div className="proto-control sticky top-0 z-40 border-x-0 border-t-0 bg-ground/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Lockup size="sm" />
        <Seal tone="signal">Prototipo · datos de ejemplo</Seal>
        <nav aria-label="Pantallas del prototipo" className="chip-row order-last w-full sm:order-none sm:ml-auto sm:w-auto">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => `inline-flex min-h-10 items-center px-3 text-sm transition-colors ${isActive ? 'bg-ink text-ground' : 'text-ink-2 hover:text-ink'}`}>
              {t.label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle className="ml-auto sm:ml-0" />
      </div>
    </div>
  )
}

/* ───────────────────────────── Acceso ───────────────────────────── */
function Acceso() {
  const [ver, setVer] = useState(false)
  const [estado, setEstado] = useState<'normal' | 'error' | 'cargando'>('normal')
  const [ayuda, setAyuda] = useState(false)
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-57px)] max-w-[1440px] lg:grid-cols-[1.05fr_1fr]">
      <section aria-labelledby="acc-t" className="flex items-center px-4 py-14 sm:px-10 lg:px-20">
        <div className="w-full max-w-[420px]">
          <p className="font-mono text-[11px] uppercase tracking-[.18em] text-ink-3">{SITE.institution}</p>
          <h1 id="acc-t" className="mt-4 font-display text-[clamp(2.2rem,4vw,3.2rem)] font-semibold leading-[1] tracking-[-.04em]">Abre tu expediente.</h1>
          <p className="mt-3 text-ink-2">Entra con la cuenta que te dio la Jefatura de Vinculación.</p>

          <div className="mt-8 grid gap-3">
            <button type="button"
              className="flex min-h-12 items-center justify-between gap-3 border border-rule-strong bg-sheet px-4 text-left text-[15px] font-medium text-ink transition-colors hover:border-ink active:scale-[.99]">
              <span className="flex items-center gap-3"><NodoMark size={22} />Continuar con tu cuenta de NODO</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-3">Residentes</span>
            </button>
            <div className="my-2 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-rule" />o con tu correo<span className="h-px flex-1 bg-rule" /></div>
          </div>

          <form className="grid gap-5" noValidate onSubmit={(e) => { e.preventDefault(); setEstado('cargando'); setTimeout(() => setEstado('normal'), 1600) }}>
            <div className="grid gap-2">
              <label htmlFor="correo" className="text-sm font-medium text-ink">Correo institucional</label>
              <input id="correo" type="email" autoComplete="username" defaultValue="ana.garcia@itm.edu.mx"
                aria-invalid={estado === 'error'} aria-describedby={estado === 'error' ? 'acc-err' : undefined}
                className={`min-h-12 border bg-sheet px-3.5 text-[15px] text-ink outline-none transition-colors focus:border-ink ${estado === 'error' ? 'border-bad' : 'border-rule-strong'}`} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="pass" className="text-sm font-medium text-ink">Contraseña</label>
              <div className={`flex min-h-12 items-center border bg-sheet transition-colors focus-within:border-ink ${estado === 'error' ? 'border-bad' : 'border-rule-strong'}`}>
                <input id="pass" type={ver ? 'text' : 'password'} autoComplete="current-password" defaultValue="vinculatec123"
                  aria-invalid={estado === 'error'} className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] text-ink outline-none" />
                <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="grid size-12 place-items-center text-ink-2 hover:text-ink">{ver ? <EyeSlash size={18} /> : <Eye size={18} />}</button>
              </div>
              {estado === 'error' && <p id="acc-err" role="alert" className="text-sm text-bad">El correo o la contraseña no coinciden. Revisa e intenta de nuevo.</p>}
            </div>
            <Button type="submit" variant="ink" disabled={estado === 'cargando'} className="w-full justify-between">
              {estado === 'cargando' ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <button type="button" onClick={() => setAyuda(true)} className="min-h-11 text-ink-2 underline-offset-4 hover:text-ink hover:underline">¿Problemas para entrar?</button>
            <button type="button" onClick={() => setEstado((s) => (s === 'error' ? 'normal' : 'error'))}
              className="proto-control min-h-9 px-2 font-mono text-[11px] text-ink-3">{estado === 'error' ? 'Ocultar error' : 'Ver estado de error'}</button>
          </div>
        </div>
      </section>

      <aside className="chapter relative hidden overflow-hidden border-l border-rule lg:block" aria-label="Sobre NODO Vincula">
        <svg aria-hidden="true" viewBox="0 0 32 32" className="absolute -right-[38%] -top-[16%] w-[105%] opacity-95">
          <circle cx="16" cy="16" r="10" fill="none" stroke="#FF5A1F" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="46 17" transform="rotate(-50 16 16)" />
          <circle cx="16" cy="16" r="2.4" fill="#F3EFE6" />
        </svg>
        <div className="relative grid h-full content-between p-14">
          <Lockup />
          <p className="max-w-[24ch] font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-.035em]">
            Preliminar, tres parciales y final. <span className="text-ink-2">Todo en un expediente.</span>
          </p>
        </div>
      </aside>

      <Hoja abierta={ayuda} onClose={() => setAyuda(false)} titulo="Soporte de NODO Vincula">
        <p className="text-ink-2">Escríbenos y cuéntanos qué pasa. Si aún no tienes cuenta, la crea la Jefatura de Vinculación.</p>
        <div className="mt-5 grid gap-3 border-t border-rule pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="select-all text-ink">{SITE.support.email}</span>
            <CopyButton text={SITE.support.email} label="correo de soporte" />
          </div>
          <a href={SITE.support.github} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-ink-2 hover:text-ink">
            <GithubLogo size={18} aria-hidden="true" />{SITE.support.githubLabel}
          </a>
        </div>
      </Hoja>
    </main>
  )
}

/** Diálogo: hoja desde abajo en celular, centrado en escritorio (patrón NODO). */
export function Hoja({ abierta, onClose, titulo, children }: { abierta: boolean; onClose: () => void; titulo: string; children: ReactNode }) {
  useEffect(() => {
    if (!abierta) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [abierta, onClose])
  return (
    <AnimatePresence>
      {abierta && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(5_6_8/.6)] sm:items-center" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}
            className="tick w-full max-w-[460px] border border-rule bg-sheet p-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] sm:p-7"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="font-display text-xl font-semibold tracking-[-.02em]">{titulo}</h2>
              <button type="button" onClick={onClose} aria-label="Cerrar" autoFocus className="-mr-2 -mt-2 grid size-11 place-items-center text-ink-2 hover:text-ink"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ───────────────────────────── Marco de la app ───────────────────────────── */
type Rol = 'residente' | 'asesor' | 'jefe'
type Item = { label: string; icon: Icon; badge?: number; children?: string[] }

const MENU: Record<Rol, { items: Item[]; movil: string[]; usuario: string; rolLabel: string }> = {
  residente: {
    usuario: 'Ana García Mendoza', rolLabel: 'Residente',
    items: [
      { label: 'Inicio', icon: House }, { label: 'Seguimiento', icon: Checks }, { label: 'Fuente del proyecto', icon: Signature },
      { label: 'Reportes', icon: FileText, children: ['Preliminar', 'Parciales', 'Final'] }, { label: 'Avisos', icon: Bell, badge: 2 },
      { label: 'Calendario', icon: CalendarBlank }, { label: 'Perfil', icon: UserCircle },
    ],
    movil: ['Inicio', 'Reportes', 'Calendario', 'Avisos'],
  },
  asesor: {
    usuario: 'Marco Reyes Hernández', rolLabel: 'Asesor',
    items: [
      { label: 'Inicio', icon: House }, { label: 'Proyectos', icon: Folder }, { label: 'Revisión', icon: FileText, badge: 3 },
      { label: 'Avisos', icon: Bell, badge: 4 }, { label: 'Calendario', icon: CalendarBlank }, { label: 'Perfil', icon: UserCircle },
    ],
    movil: ['Inicio', 'Revisión', 'Proyectos', 'Calendario'],
  },
  jefe: {
    usuario: 'Carlos Mendoza Pérez', rolLabel: 'Jefatura de Vinculación',
    items: [
      { label: 'Inicio', icon: House }, { label: 'Empresas', icon: Buildings }, { label: 'Proyectos', icon: Briefcase },
      { label: 'Asignación', icon: UserPlus }, { label: 'Seguimiento', icon: Checks }, { label: 'Fuentes', icon: Signature, badge: 2 },
      { label: 'Estadísticas', icon: ChartBar }, { label: 'Avisos', icon: Bell, badge: 5 }, { label: 'Calendario', icon: CalendarBlank },
      { label: 'Administración', icon: Users }, { label: 'Perfil', icon: UserCircle },
    ],
    movil: ['Inicio', 'Seguimiento', 'Proyectos', 'Fuentes'],
  },
}

function iniciales(n: string) { return n.split(' ').slice(0, 2).map((p) => p[0]).join('') }

function AppFrame({ rol, children }: { rol: Rol; children: ReactNode }) {
  const m = MENU[rol]
  const [mas, setMas] = useState(false)
  const [abierto, setAbierto] = useState(true)
  const { pathname } = useLocation()
  useEffect(() => setMas(false), [pathname])
  const avisos = m.items.find((i) => i.label === 'Avisos')?.badge ?? 0
  const movil = m.movil.map((l) => m.items.find((i) => i.label === l)!)
  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] md:grid-cols-[248px_minmax(0,1fr)]">
      {/* Barra lateral: la pestaña activa entra en la hoja */}
      <aside className="sticky top-[57px] hidden h-[calc(100dvh-57px)] flex-col border-r border-rule bg-tray md:flex" aria-label="Navegación">
        <div className="px-5 pb-5 pt-6"><Lockup size="sm" /></div>
        <nav className="flex-1 overflow-y-auto py-2 pl-3" aria-label={`Menú de ${m.rolLabel}`}>
          <ul className="grid gap-0.5">
            {m.items.map((it) => {
              const on = it.label === 'Inicio'
              const I = it.icon
              return (
                <li key={it.label}>
                  <button type="button" aria-current={on ? 'page' : undefined}
                    onClick={() => it.children && setAbierto((a) => !a)}
                    className={`relative -mr-px flex min-h-11 w-full items-center gap-3 pl-3 pr-4 text-left text-[14px] transition-colors
                      ${on ? 'tab-left border border-r-0 border-rule bg-sheet font-semibold text-ink' : 'text-ink-2 hover:text-ink'}`}>
                    {on && <span aria-hidden="true" className="absolute inset-y-2.5 left-0 w-0.5 bg-signal" />}
                    <I size={18} weight={on ? 'regular' : 'light'} aria-hidden="true" />
                    <span className="flex-1">{it.label}</span>
                    {it.badge ? <span className="min-w-5 bg-signal px-1 text-center font-mono text-[11px] font-semibold text-on-signal">{it.badge}</span> : null}
                    {it.children && <CaretDown size={14} aria-hidden="true" className={`transition-transform ${abierto ? '' : '-rotate-90'}`} />}
                  </button>
                  {it.children && abierto && (
                    <ul className="ml-9 grid border-l border-rule">
                      {it.children.map((c) => <li key={c}><button type="button" className="min-h-10 w-full pl-4 text-left text-[13.5px] text-ink-2 hover:text-ink">{c}</button></li>)}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-3 border-t border-rule px-5 py-4">
          <span aria-hidden="true" className="grid size-9 place-items-center bg-ink font-mono text-[12px] font-semibold text-ground">{iniciales(m.usuario)}</span>
          <div className="min-w-0"><p className="truncate text-[13.5px] font-medium">{m.usuario}</p><p className="text-[12px] text-ink-3">{m.rolLabel}</p></div>
        </div>
      </aside>

      <div className="min-w-0 bg-sheet pb-24 md:pb-0">
        {/* Barra superior */}
        <header className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-rule bg-sheet/95 px-4 py-2.5 backdrop-blur-md sm:px-8">
          <span className="md:hidden"><NodoMark size={24} /></span>
          <h1 className="font-display text-lg font-semibold tracking-[-.02em] md:hidden">Inicio</h1>
          <button type="button" className="ml-auto flex min-h-10 w-full max-w-[340px] items-center gap-2 border border-rule bg-ground px-3 text-sm text-ink-3 hover:border-rule-strong max-sm:hidden md:ml-0">
            <MagnifyingGlass size={16} aria-hidden="true" className="shrink-0" /><span className="truncate">Buscar residente, reporte o empresa</span>
            <kbd className="ml-auto shrink-0 whitespace-nowrap border border-rule px-1.5 font-mono text-[11px] text-ink-2">Ctrl K</kbd>
          </button>
          <button type="button" aria-label="Buscar" className="ml-auto grid size-10 place-items-center text-ink-2 sm:hidden"><MagnifyingGlass size={20} /></button>
          <button type="button" aria-label={`Avisos: ${avisos} sin leer`} className="relative grid size-10 place-items-center text-ink-2 hover:text-ink sm:ml-auto">
            <Bell size={20} />
            {avisos > 0 && <span className="absolute right-1 top-1 min-w-4 bg-signal px-0.5 text-center font-mono text-[10px] font-semibold leading-4 text-on-signal">{avisos}</span>}
          </button>
          <span aria-hidden="true" className="hidden size-9 place-items-center bg-ink font-mono text-[12px] font-semibold text-ground sm:grid md:hidden">{iniciales(m.usuario)}</span>
        </header>

        <div className="px-4 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</div>
      </div>

      {/* Celular: barra inferior por rol + hoja "Más" */}
      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-rule bg-sheet pb-[env(safe-area-inset-bottom,0px)] md:hidden">
        {movil.map((it) => {
          const on = it.label === 'Inicio'
          const I = it.icon
          return (
            <button key={it.label} type="button" aria-current={on ? 'page' : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${on ? 'font-semibold text-ink' : 'text-ink-2'}`}>
              {on && <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 bg-signal" />}
              <I size={20} weight={on ? 'regular' : 'light'} aria-hidden="true" />{it.label}
              {it.badge ? <span className="absolute right-[22%] top-1.5 min-w-4 bg-signal px-0.5 font-mono text-[10px] leading-4 text-on-signal">{it.badge}</span> : null}
            </button>
          )
        })}
        <button type="button" onClick={() => setMas(true)} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-ink-2">
          <DotsThreeOutline size={20} weight="light" aria-hidden="true" />Más
        </button>
      </nav>
      <Hoja abierta={mas} onClose={() => setMas(false)} titulo="Más secciones">
        <ul className="grid grid-cols-2 gap-px border border-rule bg-rule">
          {m.items.filter((i) => !m.movil.includes(i.label)).map((it) => {
            const I = it.icon
            return (
              <li key={it.label}>
                <button type="button" className="flex min-h-14 w-full items-center gap-2.5 bg-sheet px-3 text-left text-sm">
                  <I size={18} weight="light" aria-hidden="true" />{it.label}
                </button>
              </li>
            )
          })}
        </ul>
      </Hoja>
    </div>
  )
}
