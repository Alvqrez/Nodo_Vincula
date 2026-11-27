/** Ordena las secciones de la portada pública de Nodo Vincula. */

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowRight, Bell, BookOpen, Buildings, CalendarCheck, ChartLineUp, ChatText, ClockCountdown, FileArrowUp,
  GithubLogo, Plus, SealCheck, type IconProps,
} from '@phosphor-icons/react'
import type { ComponentType } from 'react'
import { Lockup, NodoMark } from '@/components/brand'
import { Bezel, Button, CopyButton, Eyebrow, FolderTabs, Magnetic, Reveal, ThemeSegmented, Words } from '@/components/ui'
import { FAQ, FEATURES, ROLES, SITE, STEPS, type RoleId } from '@/content'
import Nav from './Nav'
import { AsesorFragment, ExpedienteMini, ResidenteFragment, VinculacionFragment } from './fragments'
import './landing.css'

export default function Landing() {
  return (
    <div className="page-in">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-ground">
        Saltar al contenido
      </a>
      <Nav />
      <main id="contenido">
        <Hero />
        <ParaQuien />
        <ComoFunciona />
        <QueIncluye />
        <CapituloNodo />
        <Preguntas />
      </main>
      <Pie />
    </div>
  )
}

/* ── 1 · Héroe: banda de amanecer con grano, titular asimétrico, expediente que se abre ── */
function Hero() {
  return (
    <section id="inicio" aria-labelledby="hero-t" className="relative">
      <div className="sunrise sunrise-clip on-ink">
        <div aria-hidden="true" className="sunrise-grain" />
        <div className="mx-auto grid max-w-[1240px] gap-8 px-4 pb-56 pt-36 sm:px-8 md:pb-72 md:pt-44 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div className="grid gap-6">
            <Eyebrow className="justify-self-start !bg-white/8 !text-ink-2">{SITE.institution} · Residencias profesionales</Eyebrow>
            <h1 id="hero-t" className="max-w-[16ch] font-display text-[clamp(2.6rem,6.2vw,5.4rem)] font-semibold leading-[.98] tracking-[-.045em] text-ink">
              <Words text="Tu residencia, con su expediente al día." />
            </h1>
          </div>
          <div className="grid gap-6 lg:pb-3">
            <p className="max-w-[44ch] text-[17px] leading-relaxed text-ink-2">
              Entregas, revisiones, citas y fechas del período en un solo lugar para residentes, asesores y la Jefatura de Vinculación.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Magnetic><Button href={SITE.appUrl} variant="signal">Entrar a NODO Vincula</Button></Magnetic>
              <Button href="#como-funciona" variant="ghost" icon={ArrowRight} className="!border-white/25 !text-ink hover:!bg-white/8">Cómo funciona</Button>
            </div>
          </div>
        </div>
      </div>
      <div className="relative mx-auto -mt-44 max-w-[1120px] px-4 sm:px-8 md:-mt-56">
        <div className="shutter">
          <Bezel className="shadow-paper" innerClassName="overflow-hidden">
            <ExpedienteMini />
          </Bezel>
        </div>
      </div>
    </section>
  )
}

/* ── 2 · Para quién: pestañas de carpeta por rol ── */
const FRAGMENT: Record<RoleId, () => JSX.Element> = {
  residente: ResidenteFragment, asesor: AsesorFragment, vinculacion: VinculacionFragment,
}

// La selección del rol cambia la vista de ejemplo mostrada en esta sección.
function ParaQuien() {
  const [rol, setRol] = useState<RoleId>('residente')
  const r = ROLES.find((x) => x.id === rol)!
  const Frag = FRAGMENT[rol]
  return (
    <section id="para-quien" aria-labelledby="pq-t" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 pt-28 sm:px-8 md:pt-40">
      <Reveal className="grid gap-5 md:grid-cols-[1fr_1.4fr] md:items-end">
        <div className="grid gap-5">
          <Eyebrow className="justify-self-start">Para quién</Eyebrow>
          <h2 id="pq-t" className="font-display text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.02] tracking-[-.035em]">Tres personas, un mismo expediente.</h2>
        </div>
        <p className="max-w-[52ch] text-ink-2">Cada rol entra a su propia vista con sus propios permisos. Lo que uno hace, el otro lo ve al momento.</p>
      </Reveal>

      <Reveal delay={120} className="mt-12">
        <FolderTabs label="Roles" tabs={ROLES.map(({ id, label }) => ({ id, label }))} value={rol} onChange={setRol} />
        <div role="tabpanel" aria-label={r.label} className="border border-rule bg-sheet shadow-paper">
          <div key={rol} className="tab-in grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div className="grid content-start gap-5">
              <h3 className="font-display text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold leading-tight tracking-[-.03em]">{r.title}</h3>
              <p className="text-ink-2">{r.summary}</p>
              <ul className="mt-2 grid gap-0 border-t border-rule">
                {r.can.map((c) => (
                  <li key={c} className="grid grid-cols-[1.25rem_1fr] gap-3 border-b border-rule py-3 text-[15px] leading-relaxed text-ink">
                    <SealCheck size={18} weight="regular" className="mt-0.5 text-signal-ink" aria-hidden="true" />{c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="self-center"><Frag /></div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ── 3 · Cómo funciona: índice del expediente con línea que se dibuja al bajar ── */
function ComoFunciona() {
  const listRef = useRef<HTMLOListElement>(null)
  const [p, setP] = useState(0)
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    // Un observador por paso: la línea crece hasta el último paso visible (sin escuchar el scroll).
    const items = Array.from(el.querySelectorAll('li'))
    const seen = new Set<number>()
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) seen.add(items.indexOf(e.target as HTMLLIElement)) })
      setP(seen.size ? (Math.max(...seen) + 1) / items.length : 0)
    }, { rootMargin: '0px 0px -35% 0px' })
    items.forEach((i) => io.observe(i))
    return () => io.disconnect()
  }, [])
  return (
    <section id="como-funciona" aria-labelledby="cf-t" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 pt-28 sm:px-8 md:pt-40">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.3fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal className="grid gap-5">
            <Eyebrow className="justify-self-start">Cómo funciona</Eyebrow>
            <h2 id="cf-t" className="font-display text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.02] tracking-[-.035em]">De la asignación al cierre, en cinco folios.</h2>
            <p className="max-w-[44ch] text-ink-2">El orden es el del proceso real. Cada paso deja constancia en el expediente del residente.</p>
          </Reveal>
        </div>
        <div className="relative">
          <div aria-hidden="true" className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-rule-strong">
            <div className="h-full w-px origin-top bg-signal transition-transform duration-700 ease-[var(--ease-nodo)]" style={{ transform: `scaleY(${p})` }} />
          </div>
          <ol ref={listRef} className="grid gap-4">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.folio} delay={i * 60} className="relative grid grid-cols-[2.75rem_1fr] gap-5">
                <span className="relative z-10 grid size-11 place-items-center border border-rule-strong bg-sheet font-mono text-[13px] text-ink">{s.folio}</span>
                <div className="border border-rule bg-sheet p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h3 className="font-display text-xl font-semibold tracking-[-.02em]">{s.title}</h3>
                    <span className="border border-rule-strong px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[.08em] text-ink-2">{s.who}</span>
                  </div>
                  <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ── 4 · Qué incluye: rejilla asimétrica con divisiones finas ── */
const ICONS: ComponentType<IconProps>[] = [FileArrowUp, ChatText, Bell, CalendarCheck, ClockCountdown, SealCheck, BookOpen, Buildings, ChartLineUp]
const SPAN = ['md:col-span-4 md:row-span-2', 'md:col-span-2', 'md:col-span-2', 'md:col-span-3', 'md:col-span-3', 'md:col-span-2', 'md:col-span-2', 'md:col-span-2', 'md:col-span-6']

function QueIncluye() {
  return (
    <section id="que-incluye" aria-labelledby="qi-t" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 pt-28 sm:px-8 md:pt-40">
      <Reveal className="grid gap-5 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div className="grid gap-5">
          <Eyebrow className="justify-self-start">Qué incluye</Eyebrow>
          <h2 id="qi-t" className="font-display text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.02] tracking-[-.035em]">Lo que hoy hace el sistema, sin promesas.</h2>
        </div>
        <p className="max-w-[44ch] text-ink-2">Cada función de esta lista existe y la usan los tres roles.</p>
      </Reveal>
      <Reveal delay={100} className="mt-12">
        <ul className="grid gap-px border border-rule bg-rule md:grid-cols-6">
          {FEATURES.map((f, i) => {
            const I = ICONS[i]
            const big = i === 0
            return (
              <li key={f.title} className={`bg-sheet ${SPAN[i]} ${big ? 'tick relative grid content-between gap-10 p-7 sm:p-9' : 'grid content-start gap-3 p-6'}`}>
                <I size={big ? 30 : 22} weight="light" aria-hidden="true" className={big ? 'text-signal-ink' : 'text-ink-2'} />
                <div className="grid gap-2">
                  <h3 className={`font-display font-semibold tracking-[-.02em] ${big ? 'text-[clamp(1.6rem,2.4vw,2.1rem)] leading-tight' : 'text-lg'}`}>{f.title}</h3>
                  <p className={`leading-relaxed text-ink-2 ${big ? 'max-w-[40ch] text-[16px]' : 'text-[14.5px]'}`}>{f.text}</p>
                  {big && (
                    <div className="mt-4 flex flex-wrap gap-2" aria-label="Formatos aceptados">
                      {['PDF', 'DOCX', '≤ 10 MB'].map((t) => (
                        <span key={t} className="border border-rule-strong px-2 py-1 font-mono text-[11px] tracking-[.06em] text-ink">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Reveal>
    </section>
  )
}

/* ── 5 · Capítulo NODO: siempre en tinta, el anillo abierto gigante recortado ── */
function CapituloNodo() {
  return (
    <section aria-labelledby="nodo-t" className="chapter relative mt-28 overflow-hidden md:mt-40">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="pointer-events-none absolute -bottom-[38%] -right-[45%] w-[125vw] opacity-35 md:-right-[12%] md:bottom-auto md:top-1/2 md:w-[70vw] md:-translate-y-1/2 md:opacity-90">
        <circle cx="16" cy="16" r="10" fill="none" stroke="#FF5A1F" strokeWidth="2.2" strokeLinecap="round"
          strokeDasharray="46 17" transform="rotate(-50 16 16)" className="giant-ring" style={{ '--len': 63 } as CSSProperties} />
        <circle cx="16" cy="16" r="2.2" fill="#F3EFE6" />
      </svg>
      <div className="relative mx-auto grid max-w-[1240px] gap-8 px-4 py-28 sm:px-8 md:py-40">
        <Reveal className="grid max-w-[34rem] gap-6">
          <span className="inline-flex items-center gap-3 font-display text-2xl font-bold tracking-tight"><NodoMark size={34} />NODO</span>
          <h2 id="nodo-t" className="font-display text-[clamp(2rem,4.4vw,3.6rem)] font-semibold leading-[1.02] tracking-[-.035em]">
            NODO es el mapa. <span className="text-ink-2">Vincula es el expediente.</span>
          </h2>
          <p className="max-w-[46ch] text-[17px] leading-relaxed text-ink-2">
            NODO es la red estudiantil del {SITE.institutionShort}: eventos, grupos y trayectoria. NODO Vincula es su app de residencias profesionales.
          </p>
          <div><Button href={SITE.nodoUrl} variant="signal" target="_blank" rel="noopener noreferrer">Conocer NODO</Button></div>
        </Reveal>
      </div>
    </section>
  )
}

/* ── 6 · Preguntas: acordeón accesible ── */
// Las preguntas frecuentes se presentan como controles que expanden y contraen la respuesta.
function Preguntas() {
  const [abierta, setAbierta] = useState<number | null>(0)
  const base = useId()
  return (
    <section id="preguntas" aria-labelledby="fq-t" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 pt-28 sm:px-8 md:pt-40">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.3fr] lg:gap-20">
        <Reveal className="grid content-start gap-5">
          <Eyebrow className="justify-self-start">Preguntas</Eyebrow>
          <h2 id="fq-t" className="font-display text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.02] tracking-[-.035em]">Lo que preguntan al empezar.</h2>
        </Reveal>
        <Reveal delay={100}>
          <ul className="border-t border-rule-strong">
            {FAQ.map((f, i) => {
              const open = abierta === i
              return (
                <li key={f.q} className="border-b border-rule">
                  <h3>
                    <button type="button" id={`${base}-b${i}`} aria-expanded={open} aria-controls={`${base}-p${i}`}
                      onClick={() => setAbierta(open ? null : i)}
                      className="flex min-h-16 w-full items-center justify-between gap-6 py-4 text-left text-[17px] font-medium text-ink transition-colors hover:text-signal-ink">
                      {f.q}
                      <Plus size={18} aria-hidden="true" className={`shrink-0 transition-transform duration-500 ease-[var(--ease-expo)] ${open ? 'rotate-45' : ''}`} />
                    </button>
                  </h3>
                  <div id={`${base}-p${i}`} role="region" aria-labelledby={`${base}-b${i}`} className="acc" data-open={open}>
                    <div><p className="max-w-[60ch] pb-6 text-[15.5px] leading-relaxed text-ink-2">{f.a}</p></div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

/* ── 7 · Cierre y pie ── */
function Pie() {
  return (
    <footer className="chapter mt-28 md:mt-40">
      <div className="mx-auto grid max-w-[1240px] gap-16 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+40px)] pt-24 sm:px-8 md:pt-32">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
          <h2 className="font-display text-[clamp(2.2rem,5vw,4.2rem)] font-semibold leading-[.98] tracking-[-.04em]">Abre tu expediente.</h2>
          <div className="grid gap-4 md:justify-items-end">
            <p className="max-w-[40ch] text-ink-2 md:text-right">Tu cuenta la crea la Jefatura de Vinculación. Si ya la tienes, entra con tu correo institucional.</p>
            <Magnetic><Button href={SITE.appUrl} variant="signal">Entrar a NODO Vincula</Button></Magnetic>
          </div>
        </div>
        <div className="grid gap-10 border-t border-rule pt-10 md:grid-cols-[1.2fr_1fr_auto]">
          <div className="grid content-start gap-3">
            <Lockup />
            <p className="text-sm text-ink-2">{SITE.institution}</p>
          </div>
          <div className="grid content-start gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[.16em] text-ink-3">Soporte</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="select-all text-[15px] text-ink">{SITE.support.email}</span>
              <CopyButton text={SITE.support.email} label="correo de soporte" />
            </div>
            <a href={SITE.support.github} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-[15px] text-ink-2 transition-colors hover:text-ink">
              <GithubLogo size={18} aria-hidden="true" />{SITE.support.githubLabel}
            </a>
          </div>
          <div className="grid content-start gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[.16em] text-ink-3">Apariencia</p>
            <ThemeSegmented />
          </div>
        </div>
        <p className="font-mono text-[11px] tracking-[.06em] text-ink-3">© 2026 NODO Vincula · Parte de NODO</p>
      </div>
    </footer>
  )
}
