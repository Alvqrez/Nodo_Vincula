import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CalendarBlank, Check, FilePdf, FileDoc, Tray, UploadSimple, VideoCamera, MapPin } from '@phosphor-icons/react'
import { Button, Seal } from '@/components/ui'
import {
  AVANCES, BANDEJA, CITAS_ASESOR, CITAS_RESIDENTE, CONVENIOS, CRITERIOS, ESTADO, EXPEDIENTE_ANA, FEEDBACK_P2, FUENTES, HOY,
  MATRIZ, MIS_RESIDENTES, PERIODO, REPORTES, RESIDENTE, SIN_ASESOR, type Cita, type Entrega, type Estado,
} from './data'

/* ── Piezas comunes ── */
function Encabezado({ saludo, resumen, extra }: { saludo: string; resumen: ReactNode; extra?: ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-rule pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[.18em] text-signal-ink">{HOY}</p>
        <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1] tracking-[-.04em]">{saludo}</h2>
        <p className="max-w-[62ch] text-[16.5px] leading-relaxed text-ink-2">{resumen}</p>
      </div>
      {extra}
    </div>
  )
}

function Bloque({ titulo, accion, children, className = '' }: { titulo: string; accion?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`grid content-start gap-4 ${className}`} aria-label={titulo}>
      <div className="flex items-baseline justify-between gap-3 border-b border-rule-strong pb-2">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[.16em] text-ink-2">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  )
}

function Escenario<T extends string>({ opciones, valor, onChange }: { opciones: { id: T; label: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="proto-control flex flex-wrap items-center gap-1 p-1" role="radiogroup" aria-label="Escenario del prototipo">
      <span className="px-2 font-mono text-[10.5px] uppercase tracking-[.12em] text-ink-3">Escenario</span>
      {opciones.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} onClick={() => onChange(o.id)}
          className={`min-h-9 px-2.5 text-xs ${valor === o.id ? 'bg-ink text-ground' : 'text-ink-2 hover:text-ink'}`}>{o.label}</button>
      ))}
    </div>
  )
}

function MiniRuta({ ruta, label }: { ruta: Estado[]; label: string }) {
  const color: Record<Estado, string> = { aceptado: 'bg-ok', revision: 'bg-signal', corregir: 'bg-bad', pendiente: 'bg-warn', bloqueado: 'bg-ink/12' }
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`${label}: ${ruta.map((e, i) => `${REPORTES[i]} ${ESTADO[e].label}`).join(', ')}`}>
      {ruta.map((e, i) => <span key={i} className={`h-2 w-5 ${color[e]}`} />)}
    </span>
  )
}

function Citas({ citas }: { citas: Cita[] }) {
  const [estado, setEstado] = useState<Record<string, Cita['estado'] | 'Cancelada'>>({})
  return (
    <ul className="divide-y divide-rule">
      {citas.map((c) => {
        const e = estado[c.id] ?? c.estado
        const I = c.modalidad === 'Virtual' ? VideoCamera : MapPin
        return (
          <li key={c.id} className="grid gap-2 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14.5px] font-medium">{c.tipo}</p>
                <p className="text-[13px] text-ink-2">{c.invitacion ? 'Te invitó ' : 'Con '}{c.con}</p>
              </div>
              <Seal tone={e === 'Confirmada' ? 'ok' : e === 'Cancelada' ? 'neutral' : 'warn'}>{e}</Seal>
            </div>
            <p className="flex items-center gap-2 font-mono text-[12px] text-ink-2"><CalendarBlank size={14} aria-hidden="true" />{c.cuando}<I size={14} aria-hidden="true" className="ml-2" />{c.modalidad}</p>
            {c.invitacion && e === 'Pendiente' && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setEstado((s) => ({ ...s, [c.id]: 'Confirmada' }))} className="min-h-10 bg-ink px-3.5 text-sm font-medium text-ground active:scale-[.98]">Confirmar</button>
                <button type="button" onClick={() => setEstado((s) => ({ ...s, [c.id]: 'Cancelada' }))} className="min-h-10 border border-rule-strong px-3.5 text-sm text-ink active:scale-[.98]">Cancelar</button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Cargando expediente" className="grid gap-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_5rem_6rem] items-center gap-4 py-2">
          <span className="skeleton h-3" /><span className="skeleton h-4" /><span className="skeleton h-3" /><span className="skeleton h-5" />
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────────── Residente ───────────────────────────── */
export function InicioResidente() {
  const [esc, setEsc] = useState<'revision' | 'corregir' | 'cargando'>('revision')
  const reportes = EXPEDIENTE_ANA[esc === 'corregir' ? 'corregir' : 'revision']
  const resumen = esc === 'corregir'
    ? <>Tu asesor pidió cambios en el <b className="font-semibold text-ink">Parcial 2</b>. Corrígelo antes del <span className="font-mono text-ink">15 may</span>.</>
    : <>Tu <b className="font-semibold text-ink">Parcial 2</b> está en revisión. La siguiente entrega, el Parcial 3, vence el <span className="font-mono text-ink">5 de junio</span>.</>
  return (
    <div className="grid gap-10">
      <Encabezado saludo={`Buenos días, ${RESIDENTE.pila}.`} resumen={resumen}
        extra={<Escenario valor={esc} onChange={setEsc} opciones={[{ id: 'revision', label: 'En revisión' }, { id: 'corregir', label: 'Por corregir' }, { id: 'cargando', label: 'Cargando' }]} />} />
      <div className="grid gap-12 xl:grid-cols-[1.55fr_1fr]">
        <Bloque titulo={`Tu expediente · ${PERIODO}`} accion={<span className="font-mono text-[11px] text-ink-3">{RESIDENTE.proyecto}</span>}>
          {esc === 'cargando' ? <Esqueleto /> : (
            <ol className="divide-y divide-rule">
              {reportes.map((r, i) => {
                const e = ESTADO[r.estado]
                return (
                  <li key={r.nombre} className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-4 gap-y-1 py-3.5 sm:grid-cols-[2rem_1fr_7rem_auto]">
                    <span className="font-mono text-[12px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <p className={`text-[15px] ${r.estado === 'bloqueado' ? 'text-ink-3' : 'font-medium'}`}>{r.nombre}</p>
                      <p className="text-[12.5px] text-ink-3">{r.estado === 'corregir' ? FEEDBACK_P2 : r.nota ?? e.help}</p>
                    </div>
                    <span className="hidden font-mono text-[12px] text-ink-2 sm:block">límite {r.limite}</span>
                    <Seal tone={e.tone} stamped delay={i * 90}>{e.label}</Seal>
                  </li>
                )
              })}
            </ol>
          )}
          <div className="tick mt-2 grid gap-4 border border-rule bg-ground p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[.16em] text-ink-3">{esc === 'corregir' ? 'Corrección pendiente' : 'Siguiente entrega'}</p>
              <p className="mt-1 text-[17px] font-medium">{esc === 'corregir' ? 'Parcial 2' : 'Parcial 3'} · <span className="font-mono">{esc === 'corregir' ? '15 MAY 2026' : '05 JUN 2026'}</span></p>
              <p className="mt-1 text-[13px] text-ink-2">PDF o DOCX, hasta 10 MB.</p>
            </div>
            <Button variant="signal" icon={UploadSimple}>{esc === 'corregir' ? 'Entregar corrección' : 'Ir a entregar'}</Button>
          </div>
        </Bloque>
        <div className="grid content-start gap-10">
          <Bloque titulo="Tu asesor">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid size-11 place-items-center bg-ink font-mono text-[13px] font-semibold text-ground">MR</span>
              <div><p className="font-medium">{RESIDENTE.asesor.nombre}</p><p className="text-[13px] text-ink-2">{RESIDENTE.asesor.depto}</p></div>
            </div>
          </Bloque>
          <Bloque titulo="Fuente del proyecto">
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-medium">Empresa</p><p className="text-[13px] text-ink-2">{RESIDENTE.empresa}</p></div>
              <Seal tone="ok">Validada</Seal>
            </div>
          </Bloque>
          <Bloque titulo="Próximas citas"><Citas citas={CITAS_RESIDENTE} /></Bloque>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────── Asesor ───────────────────────────── */
export function InicioAsesor() {
  const [cola, setCola] = useState<Entrega[]>(BANDEJA)
  const [sel, setSel] = useState<string | null>(BANDEJA[0].id)
  const [criterios, setCriterios] = useState<boolean[]>([true, true, false])
  const [nota, setNota] = useState('')
  const [comentario, setComentario] = useState('')
  const [hecho, setHecho] = useState<{ quien: string; ok: boolean } | null>(null)
  const actual = cola.find((c) => c.id === sel) ?? null
  const esFinal = actual?.reporte === 'Final'
  const notaValida = !esFinal || (/^\d{1,3}$/.test(nota) && Number(nota) <= 100)

  const resolver = useCallback((ok: boolean) => {
    if (!actual || (ok && !notaValida)) return
    setHecho({ quien: `${actual.reporte} de ${actual.residente}`, ok })
    const resto = cola.filter((c) => c.id !== actual.id)
    setCola(resto); setSel(resto[0]?.id ?? null); setComentario(''); setNota(''); setCriterios([true, true, false])
  }, [actual, cola, notaValida])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea')) return
      const i = cola.findIndex((c) => c.id === sel)
      if (e.key === 'j' && i < cola.length - 1) setSel(cola[i + 1].id)
      if (e.key === 'k' && i > 0) setSel(cola[i - 1].id)
      if (e.key === 'a') resolver(true)
      if (e.key === 'r') resolver(false)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [cola, sel, resolver])

  const masAntiguo = cola.reduce((m, c) => Math.max(m, c.dias), 0)
  return (
    <div className="grid gap-10">
      <Encabezado saludo="Buenos días, Marco." resumen={cola.length
        ? <>{cola.length} {cola.length === 1 ? 'reporte espera' : 'reportes esperan'} tu revisión. El más antiguo llegó hace <span className="font-mono text-ink">{masAntiguo} días</span>.</>
        : <>No tienes reportes por revisar. Te avisamos cuando llegue uno.</>} />

      <Bloque titulo="Bandeja de revisión" accion={<span className="hidden font-mono text-[11px] text-ink-3 sm:block">J/K moverse · A aceptar · R pedir corrección</span>}>
        <AnimatePresence>
          {hecho && (
            <motion.p key={hecho.quien} role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 text-sm text-ink-2">
              <Seal tone={hecho.ok ? 'ok' : 'bad'} stamped>{hecho.ok ? 'Aceptado' : 'Por corregir'}</Seal>{hecho.quien}. El residente ya recibió el aviso.
            </motion.p>
          )}
        </AnimatePresence>
        {cola.length === 0 ? (
          <div className="grid justify-items-start gap-3 border border-dashed border-rule-strong p-8">
            <Tray size={28} weight="light" className="text-ink-3" aria-hidden="true" />
            <p className="font-medium">Bandeja al día.</p>
            <p className="max-w-[46ch] text-sm text-ink-2">Cuando un residente entregue un reporte aparecerá aquí, ordenado por días de espera.</p>
            <button type="button" onClick={() => { setCola(BANDEJA); setSel(BANDEJA[0].id); setHecho(null) }} className="proto-control min-h-9 px-2 font-mono text-[11px] text-ink-3">Reiniciar prototipo</button>
          </div>
        ) : (
          <div className="grid border border-rule lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.3fr)]">
            <ul className="divide-y divide-rule border-b border-rule lg:border-b-0 lg:border-r" aria-label="Entregas por revisar">
              <AnimatePresence initial={false}>
                {cola.map((c) => {
                  const on = c.id === sel
                  return (
                    <motion.li key={c.id} layout exit={{ opacity: 0, x: -24 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
                      <button type="button" onClick={() => setSel(c.id)} aria-pressed={on}
                        className={`relative grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-5 py-4 text-left transition-colors ${on ? 'bg-ground' : 'hover:bg-ink/[.03]'}`}>
                        {on && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 bg-signal" />}
                        <span className="truncate text-[15px] font-medium">{c.residente}</span>
                        <span className={`font-mono text-[12px] ${c.dias > 5 ? 'text-signal-ink' : 'text-ink-3'}`}>{c.dias} d</span>
                        <span className="text-[13px] text-ink-2">{c.reporte} · {c.empresa}</span>
                      </button>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
            {actual && (
              <div key={actual.id} className="grid content-start gap-6 p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[.16em] text-ink-3">{actual.reporte} · llegó el {actual.llego}</p>
                    <h4 className="mt-1 font-display text-2xl font-semibold tracking-[-.025em]">{actual.residente}</h4>
                    <p className="text-[13.5px] text-ink-2">{actual.proyecto}</p>
                  </div>
                  <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex min-h-11 items-center gap-2 border border-rule px-3 text-sm hover:border-rule-strong">
                    {actual.archivo.endsWith('.pdf') ? <FilePdf size={18} aria-hidden="true" /> : <FileDoc size={18} aria-hidden="true" />}
                    <span className="font-mono text-[12px]">{actual.archivo}</span><span className="text-ink-3">{actual.peso}</span><ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                </div>
                <fieldset className="grid gap-1">
                  <legend className="mb-2 text-sm font-medium">Criterios</legend>
                  {CRITERIOS.map((cr, i) => (
                    <label key={cr} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-rule text-[14.5px]">
                      <input type="checkbox" checked={criterios[i]} onChange={() => setCriterios((s) => s.map((v, j) => (j === i ? !v : v)))} className="peer sr-only" />
                      <span aria-hidden="true" className="grid size-5 place-items-center border border-rule-strong text-ground peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-signal">
                        {criterios[i] && <Check size={13} weight="bold" />}
                      </span>{cr}
                    </label>
                  ))}
                </fieldset>
                <div className="grid gap-2">
                  <label htmlFor="coment" className="text-sm font-medium">Comentario para el residente</label>
                  <textarea id="coment" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)}
                    placeholder="Qué está bien y qué debe corregir."
                    className="border border-rule-strong bg-sheet p-3 text-[15px] outline-none focus:border-ink" />
                  <p className="text-[12.5px] text-ink-3">Lo verá junto a la decisión.</p>
                </div>
                {esFinal && (
                  <div className="grid max-w-[220px] gap-2">
                    <label htmlFor="nota" className="text-sm font-medium">Calificación del reporte final</label>
                    <input id="nota" inputMode="numeric" value={nota} onChange={(e) => setNota(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      aria-invalid={nota !== '' && !notaValida} aria-describedby="nota-ayuda"
                      className={`min-h-11 border bg-sheet px-3 font-mono text-lg outline-none focus:border-ink ${nota !== '' && !notaValida ? 'border-bad' : 'border-rule-strong'}`} />
                    <p id="nota-ayuda" className={`text-[12.5px] ${nota !== '' && !notaValida ? 'text-bad' : 'text-ink-3'}`}>
                      {nota !== '' && !notaValida ? 'Escribe un número entero de 0 a 100.' : 'Entero de 0 a 100. Obligatoria para aceptar.'}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button variant="ink" icon={Check} onClick={() => resolver(true)} disabled={!notaValida || (esFinal && nota === '')}>Aceptar</Button>
                  <Button variant="ghost" noIcon onClick={() => resolver(false)}>Pedir corrección</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Bloque>

      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <Bloque titulo="Mis residentes">
          <ul className="divide-y divide-rule">
            {MIS_RESIDENTES.map((r) => (
              <li key={r.nombre} className="grid gap-x-4 gap-y-1.5 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0"><p className="truncate font-medium">{r.nombre}</p><p className="text-[13px] text-ink-2">{r.empresa} · {r.ultimo}</p></div>
                <MiniRuta ruta={r.ruta} label={r.nombre} />
              </li>
            ))}
          </ul>
        </Bloque>
        <Bloque titulo="Próximas citas"><Citas citas={CITAS_ASESOR} /></Bloque>
      </div>
    </div>
  )
}

/* ───────────────────────────── Vinculación ───────────────────────────── */
const CELDA: Record<Estado, string> = { aceptado: 'bg-ok', revision: 'bg-signal', corregir: 'bg-bad', pendiente: 'bg-warn', bloqueado: 'bg-ink/10' }

export function InicioVinculacion() {
  const [periodo, setPeriodo] = useState<'actual' | 'anterior'>('actual')
  const [avances, setAvances] = useState(AVANCES)
  const [fuentes, setFuentes] = useState(FUENTES)
  const filas = MATRIZ[periodo]
  const cuenta = useMemo(() => {
    const c = { revision: 0, corregir: 0 }
    filas.forEach((f) => f.ruta.forEach((e) => { if (e === 'revision') c.revision++; if (e === 'corregir') c.corregir++ }))
    return c
  }, [filas])
  return (
    <div className="grid gap-10">
      <Encabezado saludo="Buenos días, Carlos." resumen={periodo === 'actual'
        ? <>{filas.length} residentes en {PERIODO}. Hay <span className="font-mono text-ink">{cuenta.revision}</span> reportes en revisión, <span className="font-mono text-ink">{cuenta.corregir}</span> por corregir y <span className="font-mono text-ink">{avances.length}</span> solicitudes de avance esperando tu aprobación.</>
        : <>No hay residentes registrados en Ago–Dic 2025.</>}
        extra={
          <div className="grid gap-2">
            <label htmlFor="per" className="text-sm font-medium">Período</label>
            <select id="per" value={periodo} onChange={(e) => setPeriodo(e.target.value as 'actual' | 'anterior')}
              className="min-h-11 border border-rule-strong bg-sheet px-3 text-[15px] outline-none focus:border-ink">
              <option value="actual">Ene–Jun 2026 · activo</option><option value="anterior">Ago–Dic 2025 · cerrado</option>
            </select>
          </div>
        } />
      <div className="grid gap-12 xl:grid-cols-[1.5fr_1fr]">
        <Bloque titulo="Entregas por residente" accion={<span className="font-mono text-[11px] text-ink-3">P · 1 · 2 · 3 · F</span>}>
          {filas.length === 0 ? (
            <div className="grid justify-items-start gap-3 border border-dashed border-rule-strong p-8">
              <p className="font-medium">Este período no tiene residentes.</p>
              <p className="max-w-[46ch] text-sm text-ink-2">Asigna proyecto, asesor y residentes desde Asignación para empezar su seguimiento.</p>
              <Button variant="ghost">Ir a Asignación</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-separate border-spacing-y-1 text-left">
                <caption className="sr-only">Estado de los cinco reportes de cada residente en {PERIODO}</caption>
                <thead>
                  <tr className="font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-3">
                    <th scope="col" className="pb-2 font-medium">Residente</th><th scope="col" className="pb-2 font-medium">Asesor</th>
                    {REPORTES.map((r) => <th key={r} scope="col" className="w-12 pb-2 text-center font-medium">{r === 'Preliminar' ? 'P' : r === 'Final' ? 'F' : r.slice(-1)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.residente}>
                      <th scope="row" className="py-1.5 pr-4 text-[14.5px] font-medium">{f.residente}</th>
                      <td className={`pr-4 text-[13px] ${f.asesor === 'Sin asesor' ? 'text-signal-ink' : 'text-ink-2'}`}>{f.asesor}</td>
                      {f.ruta.map((e, i) => (
                        <td key={i} className="px-0.5">
                          <span className={`block h-7 ${CELDA[e]}`} title={`${REPORTES[i]}: ${ESTADO[e].label}`} />
                          <span className="sr-only">{REPORTES[i]}: {ESTADO[e].label}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Leyenda">
            {(['aceptado', 'revision', 'corregir', 'pendiente', 'bloqueado'] as Estado[]).map((e) => (
              <li key={e} className="inline-flex items-center gap-2 text-[12.5px] text-ink-2"><span aria-hidden="true" className={`size-3 ${CELDA[e]}`} />{ESTADO[e].label}</li>
            ))}
          </ul>
        </Bloque>

        <div className="grid content-start gap-10">
          <Bloque titulo="Avance de fase" accion={<span className="font-mono text-[12px] text-ink-3">{avances.length}</span>}>
            {avances.length === 0 ? <p className="text-sm text-ink-2">Sin solicitudes pendientes.</p> : (
              <ul className="divide-y divide-rule">
                <AnimatePresence initial={false}>
                  {avances.map((a) => (
                    <motion.li key={a.id} layout exit={{ opacity: 0, x: 24 }} className="grid gap-2 py-3.5">
                      <p className="font-medium">{a.proyecto}</p>
                      <p className="text-[13px] text-ink-2">{a.asesor} pide pasar de <b className="font-medium text-ink">{a.de}</b> a <b className="font-medium text-ink">{a.a}</b> · {a.desde}</p>
                      <div><button type="button" onClick={() => setAvances((s) => s.filter((x) => x.id !== a.id))} className="min-h-10 bg-ink px-3.5 text-sm font-medium text-ground active:scale-[.98]">Aprobar avance</button></div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Bloque>
          <Bloque titulo="Fuentes por validar" accion={<span className="font-mono text-[12px] text-ink-3">{fuentes.length}</span>}>
            {fuentes.length === 0 ? <p className="text-sm text-ink-2">Todas las fuentes están revisadas.</p> : (
              <ul className="divide-y divide-rule">
                {fuentes.map((f) => (
                  <li key={f.id} className="grid gap-1.5 py-3.5">
                    <div className="flex items-center justify-between gap-3"><p className="font-medium">{f.residente}</p><span className="font-mono text-[11px] uppercase tracking-[.08em] text-ink-3">{f.tipo}</span></div>
                    <p className="text-[13px] text-ink-2">{f.texto}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setFuentes((s) => s.filter((x) => x.id !== f.id))} className="min-h-10 bg-ink px-3.5 text-sm font-medium text-ground">Validar</button>
                      <button type="button" className="min-h-10 border border-rule-strong px-3.5 text-sm">Rechazar con motivo</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Bloque>
          <Bloque titulo="Convenios por vencer">
            <ul className="divide-y divide-rule">
              {CONVENIOS.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div><p className="font-medium">{c.empresa}</p><p className="text-[13px] text-ink-2">{c.residentes} residente{c.residentes === 1 ? '' : 's'} · vence {c.vence}</p></div>
                  <span className={`font-mono text-[13px] ${c.dias <= 30 ? 'text-signal-ink' : 'text-ink-2'}`}>{c.dias} d</span>
                </li>
              ))}
            </ul>
          </Bloque>
          <Bloque titulo="Sin asesor">
            {SIN_ASESOR.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <div><p className="font-medium">{s.residente}</p><p className="text-[13px] text-ink-2">{s.carrera} · {s.empresa}</p></div>
                <Button variant="ghost" noIcon>Asignar</Button>
              </div>
            ))}
          </Bloque>
        </div>
      </div>
    </div>
  )
}
