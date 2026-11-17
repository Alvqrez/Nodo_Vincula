/**
 * Calendario de citas. Mismo comportamiento que src/screens/CalendarioCitas.js y los mismos
 * contratos de backend/routes/citas.js: participantes por rol (+ "Solo yo"), mis citas,
 * agendar, confirmar (solo la persona invitada) y cancelar (cualquiera de las dos).
 * Celular: la agenda va primero; el mes completo queda en su propia pestaña.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  CalendarBlank, CalendarPlus, CaretLeft, CaretRight, Check, MagnifyingGlass, MapPin, User, Users, VideoCamera, X,
} from '@phosphor-icons/react'
import { EmptyState, ErrorState, Field, PageHeader, Section, Sheet, Skeleton, TextArea, TextInput } from '@/components/app'
import { Button, FolderTabs, Seal, type Tone } from '@/components/ui'
import { api } from '@/lib/api'
import { useDialog } from '@/lib/dialog'
import { useSocketEvent } from '@/lib/socket'
import { ROL_LABEL, useUsuario, type Rol } from '@/lib/session'
import { Accion, ChipRadio } from './piezas'

/* ── Catálogos (idénticos a la app anterior) ── */
const FORM_TYPES = ['Asesoría', 'Revisión de avances', 'Reunión con residente', 'Reunión con empresa', 'Reunión con vinculación', 'Evaluación', 'Otro'] as const
const MODALIDADES = ['Presencial', 'Virtual'] as const
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

type Cat = 'reunion' | 'revision' | 'residente' | 'empresa'
type Filtro = Cat | 'todas'
type Estado = 'Pendiente' | 'Confirmada' | 'Cancelada'
type Modalidad = (typeof MODALIDADES)[number]
type TipoForm = (typeof FORM_TYPES)[number]

type CitaApi = {
  id: number; tipo: string | null; motivo: string | null; notas: string | null; fecha_hora: string; lugar: string | null
  modalidad: string | null; estado: string | null; compartida: boolean; soy_solicitante: boolean; soy_participante: boolean
  solicitante_nombre: string | null; solicitante_apellidos: string | null; solicitante_rol: string | null
  participante_nombre: string | null; participante_apellidos: string | null; participante_rol: string | null
}
type Cita = {
  id: number; titulo: string; tipo: string; notas: string | null; lugar: string | null; modalidad: Modalidad; estado: Estado
  categoria: Cat; fecha: Date; dia: string; compartida: boolean; meInvitaron: boolean; con: string | null; conRol: string | null; pasada: boolean
}
type Participante = { id: string; nombre: string; rol: string; contexto?: string }

/** Misma regla que categorizarEvento() de la app anterior. */
function categoria(tipo: string): Cat {
  if (tipo.includes('Revisión')) return 'revision'
  if (tipo.includes('residente') || tipo === 'Asesoría') return 'residente'
  if (tipo.includes('empresa')) return 'empresa'
  return 'reunion'
}
const CATS: { id: Filtro; label: string }[] = [
  { id: 'todas', label: 'Todas' }, { id: 'reunion', label: 'Reunión' }, { id: 'revision', label: 'Revisión' },
  { id: 'residente', label: 'Asesoría' }, { id: 'empresa', label: 'Empresa' },
]
const ESTADO_TONO: Record<Estado, Tone> = { Confirmada: 'ok', Pendiente: 'warn', Cancelada: 'neutral' }

const pad = (n: number) => String(n).padStart(2, '0')
const claveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hora = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const diaLargo = (d: Date) => `${DIAS_LARGO[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
const fechaTexto = (d: Date) => `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}, ${hora(d)}`
const deClave = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
const rolTexto = (r: string | null) => (r ? ROL_LABEL[r as Rol] ?? r : '')
const nombre = (n: string | null, a: string | null) => [n, a].filter(Boolean).join(' ').trim()

function normalizar(c: CitaApi, ahora: Date): Cita {
  const fecha = new Date(c.fecha_hora)
  const estado = (['Pendiente', 'Confirmada', 'Cancelada'].includes(c.estado ?? '') ? c.estado : 'Pendiente') as Estado
  const compartida = Boolean(c.compartida)
  const yoPedi = Boolean(c.soy_solicitante)
  return {
    id: c.id, titulo: c.motivo || c.tipo || 'Cita', tipo: c.tipo || 'Otro', notas: c.notas, lugar: c.lugar,
    modalidad: c.modalidad === 'Virtual' ? 'Virtual' : 'Presencial', estado, categoria: categoria(c.tipo || ''),
    fecha, dia: claveDia(fecha), compartida,
    meInvitaron: compartida && Boolean(c.soy_participante) && !yoPedi,
    con: compartida ? (yoPedi ? nombre(c.participante_nombre, c.participante_apellidos) : nombre(c.solicitante_nombre, c.solicitante_apellidos)) : null,
    conRol: compartida ? (yoPedi ? c.participante_rol : c.solicitante_rol) : null,
    pasada: fecha < ahora,
  }
}

/** Símbolo de leyenda cartográfica por categoría: la forma distingue, no el color. */
function Glifo({ cat, hueco, className = '' }: { cat: Cat; hueco?: boolean; className?: string }) {
  const p = hueco ? { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 } : { fill: 'currentColor' }
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className={`size-2 shrink-0 ${className}`}>
      {cat === 'reunion' && <rect x="1" y="1" width="8" height="8" {...p} />}
      {cat === 'revision' && <path d="M5 .6 9.4 5 5 9.4.6 5Z" {...p} />}
      {cat === 'residente' && <circle cx="5" cy="5" r="4.2" {...p} />}
      {cat === 'empresa' && <path d="M5 .8 9.4 9.2H.6Z" {...p} />}
    </svg>
  )
}

export default function Calendario() {
  const u = useUsuario()
  const { confirm, notify } = useDialog()
  const hoy = new Date()
  const [citas, setCitas] = useState<Cita[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [participantes, setParticipantes] = useState<Participante[] | null>(null)
  // Residente: undefined = consultando; null = sin asesor; objeto = con asesor (regla de la app anterior)
  const [asesor, setAsesor] = useState<unknown>(u.rol === 'residente' ? undefined : true)
  const [mes, setMes] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const [dir, setDir] = useState(0)
  const [sel, setSel] = useState(() => claveDia(hoy))
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [vista, setVista] = useState<'agenda' | 'mes'>('agenda')
  const [verTodas, setVerTodas] = useState(false)
  const [form, setForm] = useState<{ open: boolean; fecha: string }>({ open: false, fecha: '' })
  const [accion, setAccion] = useState<number | null>(null)
  const [recien, setRecien] = useState<number | null>(null)
  const diaRef = useRef<HTMLDivElement>(null)

  const cargar = useCallback(async () => {
    const r = await api.get<{ citas: CitaApi[] }>('/citas/mis-citas')
    if (r.ok) {
      const ahora = new Date()
      setCitas((r.body?.citas ?? []).map((c) => normalizar(c, ahora)).sort((a, b) => a.fecha.getTime() - b.fecha.getTime()))
      setError(null)
    } else setError(r.error ?? 'No pudimos cargar tus citas.')
  }, [])
  useEffect(() => { void cargar() }, [cargar])
  useEffect(() => {
    let vivo = true
    void api.get<{ participantes: Participante[] }>('/citas/participantes').then((r) => { if (vivo) setParticipantes(r.ok ? r.body?.participantes ?? [] : []) })
    if (u.rol === 'residente') void api.get<{ asesor: unknown }>('/residente/asesor').then((r) => { if (vivo) setAsesor(r.ok ? r.body?.asesor ?? null : null) })
    return () => { vivo = false }
  }, [u.rol])
  // Tiempo real: invitaciones nuevas y cambios que hace la otra persona
  useSocketEvent('cita_nueva', () => { void cargar() })
  useSocketEvent('cita_actualizada', () => { void cargar() })

  const visibles = useMemo(() => (citas ?? []).filter((c) => filtro === 'todas' || c.categoria === filtro), [citas, filtro])
  const porDia = useMemo(() => {
    const m = new Map<string, Cita[]>()
    visibles.forEach((c) => m.set(c.dia, [...(m.get(c.dia) ?? []), c]))
    return m
  }, [visibles])
  const ahora = new Date()
  const proximas = visibles.filter((c) => c.fecha >= ahora && c.estado !== 'Cancelada')
  const porConfirmar = (citas ?? []).filter((c) => c.meInvitaron && c.estado === 'Pendiente' && !c.pasada).length

  const cambiarMes = (delta: number) => { setDir(delta); setMes((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1)) }
  const irA = (k: string, scroll = false) => {
    const d = deClave(k)
    setDir(Math.sign(d.getTime() - mes.getTime()))
    setMes(new Date(d.getFullYear(), d.getMonth(), 1))
    setSel(k)
    if (scroll) { setVista('mes'); setTimeout(() => diaRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60) }
  }

  const cambiarEstado = async (c: Cita, estado: 'Confirmada' | 'Cancelada') => {
    if (estado === 'Cancelada') {
      const ok = await confirm({
        title: 'Cancelar cita',
        message: c.con ? `Se cancelará “${c.titulo}” (${fechaTexto(c.fecha)}). ${c.con} recibirá un aviso.` : `Se cancelará “${c.titulo}” (${fechaTexto(c.fecha)}).`,
        confirmLabel: 'Cancelar cita', cancelLabel: 'Volver', destructive: true,
      })
      if (!ok) return
    }
    setAccion(c.id)
    const r = await api.patch(`/citas/${c.id}`, { estado })
    setAccion(null)
    if (r.ok) {
      notify({ type: 'success', title: estado === 'Confirmada' ? 'Cita confirmada' : 'Cita cancelada', message: c.con ? `Se avisó a ${c.con}.` : 'Tu calendario quedó actualizado.' })
      setRecien(c.id)
      await cargar()
    } else notify({ type: 'error', title: 'No se pudo actualizar la cita', message: r.error ?? 'Revisa tu conexión e intenta de nuevo.' })
  }

  const abrirForm = (fecha = '') => setForm({ open: true, fecha })
  const cargandoTodo = citas === null && !error
  const gate = u.rol === 'residente' && asesor === null && participantes !== null && participantes.length === 0

  if (gate) {
    return (
      <div className="grid gap-8">
        <PageHeader eyebrow="Agenda" title="Calendario" summary="Aquí coordinas asesorías, revisiones y reuniones con tu asesor." />
        <EmptyState icon={CalendarBlank} title="Aún no tienes asesor asignado.">
          Podrás agendar citas cuando la Jefatura de Vinculación te asigne uno. Una vez asignado, coordinas aquí tus revisiones y reuniones.
        </EmptyState>
      </div>
    )
  }

  const resumen = cargandoTodo ? 'Cargando tus citas…'
    : error ? 'No pudimos cargar tus citas.'
      : <>
        {proximas.length === 0 ? 'No tienes citas próximas.' : <><span className="font-mono text-ink">{proximas.length}</span> {proximas.length === 1 ? 'cita próxima' : 'citas próximas'}.</>}
        {porConfirmar > 0 && <> <b className="font-semibold text-signal-ink">{porConfirmar === 1 ? '1 espera tu confirmación.' : `${porConfirmar} esperan tu confirmación.`}</b></>}
      </>

  const listaProx = verTodas ? proximas : proximas.slice(0, 8)
  const selDate = deClave(sel)
  const delDia = porDia.get(sel) ?? []

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Agenda" title="Calendario" summary={resumen}
        actions={<Button variant="signal" icon={CalendarPlus} onClick={() => abrirForm()}>Agendar cita</Button>} />

      {error && <ErrorState message={error} onRetry={() => { setError(null); void cargar() }} />}

      {!error && (
        <>
          <div className="grid gap-5 sm:flex sm:items-end sm:justify-between">
            <ChipRadio desliza label="Filtrar por categoría" value={filtro} onChange={setFiltro}
              options={CATS.map((c) => ({ id: c.id, label: <>{c.id !== 'todas' && <Glifo cat={c.id} />}{c.label}</> }))} />
            <FolderTabs label="Vista" className="justify-self-start lg:hidden" value={vista} onChange={setVista}
              tabs={[{ id: 'agenda', label: 'Agenda' }, { id: 'mes', label: 'Mes' }]} />
          </div>

          <div className="-mt-8 grid gap-12 border-t border-rule pt-8 lg:mt-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:border-t-0 lg:pt-0">
            {/* ── Mes + día elegido ── */}
            <div className={`grid content-start gap-10 ${vista === 'mes' ? '' : 'hidden lg:grid'}`}>
              <section aria-labelledby="cal-mes" className="grid gap-4">
                <div className="flex items-center gap-2">
                  <h2 id="cal-mes" className="mr-auto font-display text-[1.6rem] font-semibold capitalize tracking-[-.03em]">
                    {MESES[mes.getMonth()]} <span className="font-mono text-[1.1rem] font-normal text-ink-3">{mes.getFullYear()}</span>
                  </h2>
                  {(mes.getMonth() !== hoy.getMonth() || mes.getFullYear() !== hoy.getFullYear() || sel !== claveDia(hoy)) && (
                    <Accion onClick={() => irA(claveDia(hoy))}>Hoy</Accion>
                  )}
                  <button type="button" aria-label="Mes anterior" onClick={() => cambiarMes(-1)} className="grid size-11 place-items-center border border-rule-strong text-ink-2 transition-[transform,background-color] hover:bg-ink/5 hover:text-ink active:scale-[.96]"><CaretLeft size={18} /></button>
                  <button type="button" aria-label="Mes siguiente" onClick={() => cambiarMes(1)} className="grid size-11 place-items-center border border-rule-strong text-ink-2 transition-[transform,background-color] hover:bg-ink/5 hover:text-ink active:scale-[.96]"><CaretRight size={18} /></button>
                </div>
                {cargandoTodo ? <Skeleton className="h-[22rem] w-full" /> : <Mes mes={mes} dir={dir} sel={sel} porDia={porDia} onSel={setSel} />}
              </section>

              <div ref={diaRef} className="scroll-mt-24">
                <Section title={diaLargo(selDate)} aside={<span className="font-mono text-[12.5px] text-ink-3">{delDia.length === 1 ? '1 cita' : `${delDia.length} citas`}</span>}>
                  {cargandoTodo ? <FilasEsqueleto n={2} /> : delDia.length === 0 ? (
                    <EmptyState title="Sin citas este día."
                      action={selDate >= deClave(claveDia(hoy)) ? <Accion icon={CalendarPlus} onClick={() => abrirForm(sel)}>Agendar este día</Accion> : undefined}>
                      {filtro !== 'todas' ? 'El filtro de categoría puede estar ocultando citas.' : undefined}
                    </EmptyState>
                  ) : (
                    <ul className="-mt-2 divide-y divide-rule">
                      {delDia.map((c) => <CitaFila key={c.id} c={c} modo="dia" ocupado={accion === c.id} recien={recien === c.id} onEstado={cambiarEstado} />)}
                    </ul>
                  )}
                </Section>
              </div>
            </div>

            {/* ── Agenda: próximas citas ── */}
            <div className={vista === 'agenda' ? '' : 'hidden lg:block'}>
              <Section title="Próximas citas" aside={proximas.length > 0 ? <span className="font-mono text-[12.5px] text-ink-3">{proximas.length}</span> : undefined}>
                {cargandoTodo ? <FilasEsqueleto n={4} /> : proximas.length === 0 ? (
                  <EmptyState icon={CalendarBlank} title={filtro === 'todas' ? 'No tienes citas próximas.' : 'No hay citas próximas de esta categoría.'}
                    action={<Accion icon={CalendarPlus} onClick={() => abrirForm()}>Agendar una cita</Accion>}>
                    {filtro === 'todas' && (u.rol === 'residente' ? 'Agenda una asesoría o una revisión con tu asesor. Recibirá un aviso para confirmarla.'
                      : u.rol === 'asesor' ? 'Agenda revisiones o asesorías con tus residentes. Recibirán un aviso para confirmarlas.'
                        : 'Agenda reuniones con asesores y residentes. Recibirán un aviso para confirmarlas.')}
                  </EmptyState>
                ) : (
                  <>
                    <ul className="-mt-2 divide-y divide-rule">
                      {listaProx.map((c) => <CitaFila key={c.id} c={c} modo="agenda" ocupado={accion === c.id} recien={recien === c.id} activa={sel === c.dia} onEstado={cambiarEstado} onIr={() => irA(c.dia, true)} />)}
                    </ul>
                    {proximas.length > 8 && (
                      <button type="button" onClick={() => setVerTodas((v) => !v)} className="min-h-11 justify-self-start text-[15.5px] text-ink underline underline-offset-4 hover:text-signal-ink">
                        {verTodas ? 'Mostrar menos' : `Mostrar las ${proximas.length}`}
                      </button>
                    )}
                  </>
                )}
              </Section>
            </div>
          </div>
        </>
      )}

      <FormCita abierto={form.open} fechaInicial={form.fecha} participantes={participantes}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onCreada={async (k) => { await cargar(); irA(k); setVista('mes'); setForm((f) => ({ ...f, open: false })) }} />
    </div>
  )
}

/* ── Cuadrícula del mes (tabla semántica) ── */
function Mes({ mes, dir, sel, porDia, onSel }: { mes: Date; dir: number; sel: string; porDia: Map<string, Cita[]>; onSel: (k: string) => void }) {
  const reduce = useReducedMotion()
  const hoyK = claveDia(new Date())
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const celdas: (number | null)[] = [...Array(mes.getDay()).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)]
  while (celdas.length % 7) celdas.push(null)
  const semanas = Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7))
  return (
    <div className="overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.table key={`${mes.getFullYear()}-${mes.getMonth()}`} className="w-full table-fixed border-collapse"
          initial={reduce ? false : { opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: dir * -24 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
          <caption className="sr-only">Citas de {MESES[mes.getMonth()]} de {mes.getFullYear()}</caption>
          <thead>
            <tr>{DIAS.map((d, i) => <th key={d} scope="col" abbr={DIAS_LARGO[i]} className="pb-2 text-left font-mono text-[12.5px] font-medium uppercase tracking-[.1em] text-ink-3 sm:pl-2">{d}</th>)}</tr>
          </thead>
          <tbody>
            {semanas.map((s, i) => (
              <tr key={i}>
                {s.map((d, j) => {
                  if (!d) return <td key={j} className="border border-rule bg-ink/[.025]" />
                  const k = `${mes.getFullYear()}-${pad(mes.getMonth() + 1)}-${pad(d)}`
                  const cs = porDia.get(k) ?? []
                  const esHoy = k === hoyK, on = k === sel, pasado = k < hoyK
                  const fecha = new Date(mes.getFullYear(), mes.getMonth(), d)
                  return (
                    <td key={j} className="border border-rule p-0 align-top">
                      <button type="button" onClick={() => onSel(k)} aria-pressed={on} aria-current={esHoy ? 'date' : undefined}
                        aria-label={`${diaLargo(fecha)}${esHoy ? ', hoy' : ''}${cs.length ? `, ${cs.length === 1 ? '1 cita' : `${cs.length} citas`}` : ''}`}
                        className={`relative flex h-14 w-full flex-col justify-between p-1.5 text-left transition-colors duration-150 sm:h-[4.75rem] sm:p-2
                          ${on ? 'bg-ink text-ground' : 'hover:bg-ink/[.04]'} ${esHoy && !on ? 'tick' : ''}`}>
                        <span className={`font-mono text-[14.5px] leading-none ${on ? 'font-semibold' : esHoy ? 'font-semibold text-signal-ink' : pasado ? 'text-ink-3' : 'text-ink'}`}>{d}</span>
                        {cs.length > 0 && (
                          <span className={`flex items-center gap-1 ${on ? 'text-ground' : 'text-ink-2'}`}>
                            {cs.slice(0, 3).map((c) => <Glifo key={c.id} cat={c.categoria} hueco={c.estado === 'Cancelada'} />)}
                            {cs.length > 3 && <span className="font-mono text-[12px] leading-none">+{cs.length - 3}</span>}
                          </span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </motion.table>
      </AnimatePresence>
    </div>
  )
}

/* ── Una cita: con quién, estado, y las acciones que le tocan a este usuario ── */
function CitaFila({ c, modo, ocupado, recien, activa, onEstado, onIr }:
  { c: Cita; modo: 'dia' | 'agenda'; ocupado: boolean; recien: boolean; activa?: boolean; onEstado: (c: Cita, e: 'Confirmada' | 'Cancelada') => void; onIr?: () => void }) {
  const puedeConfirmar = c.meInvitaron && c.estado === 'Pendiente' && !c.pasada
  const puedeCancelar = c.estado !== 'Cancelada' && !c.pasada
  const cancelada = c.estado === 'Cancelada'
  const M = c.modalidad === 'Virtual' ? VideoCamera : MapPin
  return (
    <li className="grid grid-cols-[4rem_1fr] gap-x-4 py-4 sm:grid-cols-[4.5rem_1fr]">
      {modo === 'agenda' ? (
        <button type="button" onClick={onIr} aria-label={`Ver el ${diaLargo(c.fecha)} en el mes`}
          className={`grid h-fit content-start gap-0.5 border px-2 py-2 text-left transition-[border-color,transform] active:scale-[.98] ${activa ? 'border-ink' : 'border-rule hover:border-rule-strong'}`}>
          <span className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-3">{DIAS[c.fecha.getDay()]}</span>
          <span className="font-display text-[1.6rem] font-semibold leading-none tracking-[-.03em]">{c.fecha.getDate()}</span>
          <span className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-2">{MESES[c.fecha.getMonth()].slice(0, 3)}</span>
        </button>
      ) : (
        <span className={`pt-0.5 font-mono text-[15.5px] ${cancelada ? 'text-ink-3 line-through' : 'text-ink'}`}>{hora(c.fecha)}</span>
      )}
      <div className="grid min-w-0 gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <p className={`min-w-0 text-[16.5px] font-medium leading-snug ${cancelada ? 'text-ink-3 line-through' : ''}`}>{c.titulo}</p>
          <Seal key={`${c.id}-${c.estado}`} tone={ESTADO_TONO[c.estado]} stamped={recien}>{c.estado}</Seal>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14.5px] text-ink-2">
          {modo === 'agenda' && <span className="font-mono text-ink">{hora(c.fecha)}</span>}
          <span className="inline-flex items-center gap-1.5"><Glifo cat={c.categoria} hueco={cancelada} className="text-ink-2" />{c.tipo}</span>
          <span className="inline-flex items-center gap-1.5"><M size={14} aria-hidden="true" />{c.modalidad}{c.lugar ? ` · ${c.lugar}` : ''}</span>
        </p>
        <p className="inline-flex items-center gap-1.5 text-[14.5px] text-ink-2">
          {c.con ? <Users size={14} aria-hidden="true" className="shrink-0" /> : <User size={14} aria-hidden="true" className="shrink-0" />}
          <span className="min-w-0">{c.con ? <>{c.meInvitaron ? 'Te invitó ' : 'Con '}<span className="text-ink">{c.con}</span>{c.conRol ? ` · ${rolTexto(c.conRol)}` : ''}</> : 'Solo en tu calendario'}</span>
        </p>
        {c.notas && <p className="max-w-[60ch] text-[14.5px] leading-relaxed text-ink-3">{c.notas}</p>}
        {puedeConfirmar && (
          <p className="inline-flex items-center gap-2 text-[14.5px] font-medium text-signal-ink"><span aria-hidden="true" className="size-1.5 bg-signal" />Falta tu confirmación</p>
        )}
        {(puedeConfirmar || puedeCancelar) && (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {puedeConfirmar && <Accion variant="ink" icon={Check} disabled={ocupado} onClick={() => onEstado(c, 'Confirmada')} label={`Confirmar la cita ${c.titulo}`}>{ocupado ? 'Guardando…' : 'Confirmar'}</Accion>}
            {puedeCancelar && <Accion variant="danger" icon={X} disabled={ocupado} onClick={() => onEstado(c, 'Cancelada')} label={`Cancelar la cita ${c.titulo}`}>Cancelar</Accion>}
          </div>
        )}
      </div>
    </li>
  )
}

function FilasEsqueleto({ n }: { n: number }) {
  return (
    <div role="status" aria-label="Cargando citas" className="grid">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-rule py-4">
          <Skeleton className="h-16" />
          <div className="grid content-start gap-2"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-4/5" /><Skeleton className="h-3 w-2/5" /></div>
        </div>
      ))}
    </div>
  )
}

/* ── Formulario para agendar: mismos tipos, validaciones y cuerpo que la app anterior ── */
function FormCita({ abierto, fechaInicial, participantes, onClose, onCreada }:
  { abierto: boolean; fechaInicial: string; participantes: Participante[] | null; onClose: () => void; onCreada: (dia: string) => Promise<void> }) {
  const { notify } = useDialog()
  const [tipo, setTipo] = useState<TipoForm>('Asesoría')
  const [modalidad, setModalidad] = useState<Modalidad>('Presencial')
  const [concepto, setConcepto] = useState('')
  const [con, setCon] = useState<string>('')
  const [buscar, setBuscar] = useState('')
  const [fecha, setFecha] = useState('')
  const [horaV, setHora] = useState('')
  const [lugar, setLugar] = useState('')
  const [notas, setNotas] = useState('')
  const [err, setErr] = useState<{ concepto?: string; fecha?: string; hora?: string; general?: string }>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setTipo('Asesoría'); setModalidad('Presencial'); setConcepto(''); setCon(''); setBuscar('')
    setFecha(fechaInicial); setHora(''); setLugar(''); setNotas(''); setErr({}); setGuardando(false)
  }, [abierto, fechaInicial])

  const lista = participantes ?? []
  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return q ? lista.filter((p) => `${p.nombre} ${p.contexto ?? ''}`.toLowerCase().includes(q)) : lista
  }, [lista, buscar])
  const elegido = lista.find((p) => p.id === con) ?? null
  const hoyK = claveDia(new Date())

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (guardando) return
    const n: typeof err = {}
    if (!fecha) n.fecha = 'Elige la fecha de la cita.'
    else if (fecha < hoyK) n.fecha = 'No puedes agendar citas en fechas pasadas.'
    if (!/^\d{2}:\d{2}$/.test(horaV)) n.hora = 'Elige la hora de la cita.'
    if (!n.fecha && !n.hora) {
      const [y, m, d] = fecha.split('-').map(Number), [h, mi] = horaV.split(':').map(Number)
      if (new Date(y, m - 1, d, h, mi) < new Date()) n.hora = 'Esa hora ya pasó. Elige una hora posterior.'
    }
    if (!concepto.trim()) n.concepto = 'Escribe el concepto de la cita.'
    setErr(n)
    if (Object.keys(n).length) {
      const id = n.concepto ? 'cita-concepto' : n.fecha ? 'cita-fecha' : 'cita-hora'
      document.getElementById(id)?.focus()
      return
    }
    setGuardando(true)
    const r = await api.post('/citas', {
      tipo, modalidad, motivo: concepto.trim(), notas: notas.trim() || null,
      participante_id: con || undefined, fecha_hora: `${fecha} ${horaV}:00`, lugar: lugar.trim() || undefined,
    })
    if (!r.ok) {
      setGuardando(false)
      setErr({ general: r.error ?? 'No se pudo agendar la cita. Revisa tu conexión e intenta de nuevo.' })
      return
    }
    const [y, m, d] = fecha.split('-').map(Number)
    const cuando = `${d} ${MESES[m - 1].slice(0, 3)} ${y}, ${horaV}`
    await onCreada(fecha)
    setGuardando(false)
    notify({
      type: 'success', title: 'Cita agendada',
      message: elegido ? `“${concepto.trim()}” · ${modalidad} · ${cuando}. Se envió la invitación a ${elegido.nombre}.` : `“${concepto.trim()}” · ${modalidad} · ${cuando}.`,
    })
  }

  return (
    <Sheet open={abierto} onClose={onClose} title="Agendar cita" wide>
      <form noValidate onSubmit={enviar} className="grid gap-6">
        <div className="grid gap-2">
          <p className="text-[15.5px] font-medium">Tipo de cita</p>
          <ChipRadio label="Tipo de cita" value={tipo} onChange={setTipo} options={FORM_TYPES.map((t) => ({ id: t, label: t }))} />
        </div>
        <div className="grid gap-2">
          <p className="text-[15.5px] font-medium">Modalidad</p>
          <ChipRadio label="Modalidad" value={modalidad} onChange={setModalidad}
            options={[{ id: 'Presencial', label: 'Presencial', icon: MapPin }, { id: 'Virtual', label: 'Virtual', icon: VideoCamera }]} />
        </div>
        <Field htmlFor="cita-concepto" label="Concepto de la cita" error={err.concepto} help={`${concepto.length}/200`}>
          <TextInput id="cita-concepto" value={concepto} maxLength={200} invalid={!!err.concepto} placeholder="Ej.: Revisión del Parcial 2"
            aria-describedby={err.concepto ? 'cita-concepto-err' : 'cita-concepto-help'}
            onChange={(e) => { setConcepto(e.target.value); if (err.concepto) setErr((x) => ({ ...x, concepto: undefined })) }} />
        </Field>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[15.5px] font-medium">Con quién</legend>
          {lista.length > 6 && (
            <div className="flex min-h-11 items-center gap-2 border border-rule-strong bg-sheet px-3 focus-within:border-ink">
              <MagnifyingGlass size={16} className="text-ink-3" aria-hidden="true" />
              <input value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar persona para invitar"
                placeholder="Buscar por nombre, carrera o número de control" className="min-w-0 flex-1 bg-transparent text-[16.5px] outline-none placeholder:text-ink-3" />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto border border-rule-strong">
            {[{ id: '', nombre: 'Solo yo', contexto: 'Queda solo en tu calendario' } as Participante, ...filtrados].map((p) => (
              <label key={p.id || 'solo'} className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-rule px-3 py-2 last:border-b-0 hover:bg-ink/[.03] has-[:checked]:bg-ink/[.05] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-signal">
                <input type="radio" name="cita-con" value={p.id} checked={con === p.id} onChange={() => setCon(p.id)} className="peer sr-only" />
                <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center border border-rule-strong peer-checked:border-ink peer-checked:bg-ink">
                  <Check size={11} weight="bold" className={con === p.id ? 'text-ground' : 'text-transparent'} />
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-[16px] ${con === p.id ? 'font-semibold' : ''}`}>{p.nombre}</span>
                  {p.contexto && <span className="block truncate text-[14px] text-ink-3">{p.contexto}</span>}
                </span>
              </label>
            ))}
            {buscar.trim() && filtrados.length === 0 && <p className="p-3 text-[15.5px] text-ink-3">Nadie coincide con “{buscar.trim()}”.</p>}
          </div>
          <p className="text-[14px] text-ink-3" aria-live="polite">
            {participantes === null ? 'Cargando personas que puedes invitar…'
              : elegido ? `${elegido.nombre} recibirá un aviso y podrá confirmar o cancelar la cita.`
                : lista.length === 0 ? 'No tienes personas vinculadas para invitar; la cita quedará solo en tu calendario.'
                  : 'Elige a quién invitar o deja la cita solo en tu calendario.'}
          </p>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field htmlFor="cita-fecha" label="Fecha" error={err.fecha}>
            <TextInput id="cita-fecha" type="date" min={hoyK} value={fecha} invalid={!!err.fecha} className="font-mono"
              aria-describedby={err.fecha ? 'cita-fecha-err' : undefined}
              onChange={(e) => { setFecha(e.target.value); setErr((x) => ({ ...x, fecha: undefined })) }} />
          </Field>
          <Field htmlFor="cita-hora" label="Hora" error={err.hora}>
            <TextInput id="cita-hora" type="time" value={horaV} invalid={!!err.hora} className="font-mono"
              aria-describedby={err.hora ? 'cita-hora-err' : undefined}
              onChange={(e) => { setHora(e.target.value); setErr((x) => ({ ...x, hora: undefined })) }} />
          </Field>
        </div>
        <Field htmlFor="cita-lugar" label="Lugar (opcional)" help={modalidad === 'Virtual' ? 'Enlace o plataforma de la videollamada.' : 'Edificio, sala u oficina.'}>
          <TextInput id="cita-lugar" value={lugar} maxLength={150} onChange={(e) => setLugar(e.target.value)} aria-describedby="cita-lugar-help"
            placeholder={modalidad === 'Virtual' ? 'Ej.: Google Meet' : 'Ej.: Oficina de Vinculación'} />
        </Field>
        <Field htmlFor="cita-notas" label="Notas (opcional)">
          <TextArea id="cita-notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Qué revisarán o qué deben llevar." />
        </Field>

        {err.general && <ErrorState message={err.general} />}

        <div className="flex flex-col-reverse gap-2 border-t border-rule pt-5 sm:flex-row sm:justify-end">
          <Accion onClick={onClose}>Cancelar</Accion>
          <Button type="submit" variant="signal" icon={Check} disabled={guardando} className="justify-between">
            {guardando ? 'Guardando…' : con ? 'Agendar y enviar invitación' : 'Agendar cita'}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
