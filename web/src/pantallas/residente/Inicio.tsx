import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { CalendarBlank, CalendarPlus, EnvelopeSimple, FolderSimpleDashed, MapPin, Signature, UploadSimple, UserCircleDashed, VideoCamera } from '@phosphor-icons/react'
import { Button, CopyButton, Seal, type Tone } from '@/components/ui'
import { EmptyState, ErrorState, PageHeader, Section, Skeleton, fechaCorta } from '@/components/app'
import { useUsuario } from '@/lib/session'
import { plazo, useAsesor, useCitas, useFuente, useProyecto, useReportes, type Cita, type Fuente, type Reporte } from './reportes'
import { RutaReportes, RutaSkeleton } from './piezas'

const saludo = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches' }
const hoy = () => new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const Mono = ({ children }: { children: ReactNode }) => <span className="font-mono text-ink">{children}</span>
const B = ({ children }: { children: ReactNode }) => <b className="font-semibold text-ink">{children}</b>

/** Una sola frase con el estado real del expediente. */
function resumen(rs: Reporte[], sinAsesor: boolean): ReactNode {
  const final = rs.find((r) => r.id === 'final')
  const corr = rs.find((r) => r.estado === 'corregir')
  const rev = rs.find((r) => r.estado === 'revision')
  const sig = rs.find((r) => r.estado === 'pendiente')
  const vence = (r: Reporte) => {
    if (!r.fecha_limite) return '; aún no tiene fecha límite.'
    const p = plazo(r.fecha_limite)
    return <>, con fecha límite el <Mono>{fechaCorta(r.fecha_limite)}</Mono>{p?.startsWith('venció') ? ` (${p})` : ''}.</>
  }
  if (final?.estado === 'aceptado') return <>Tu reporte final fue aceptado: completaste todas las entregas de tu residencia.</>
  if (corr) return <>Tu asesor pidió cambios en el <B>{corr.nombreLargo.toLowerCase()}</B>. {corr.fecha_limite ? <>Entrégalo corregido antes del <Mono>{fechaCorta(corr.fecha_limite)}</Mono>.</> : 'Entrégalo corregido en cuanto puedas.'}</>
  if (sinAsesor && sig?.id === 'preliminar') return <>Aún no tienes asesor asignado. Vinculación lo asigna antes de que entregues tu reporte preliminar.</>
  if (rev) return <>Tu <B>{rev.nombreLargo.toLowerCase()}</B> está en revisión.{sig ? <> La siguiente entrega es el {sig.nombreLargo.toLowerCase()}{vence(sig)}</> : ' Te avisamos cuando tu asesor lo revise.'}</>
  if (sig) return <>Tu siguiente entrega es el <B>{sig.nombreLargo.toLowerCase()}</B>{vence(sig)}</>
  return <>No tienes entregas abiertas. Tu asesor abre el siguiente reporte cuando acepta el anterior.</>
}

/** Bloque de siguiente acción, con un solo botón de señal. */
function SiguienteAccion({ rs, sinAsesor }: { rs: Reporte[]; sinAsesor: boolean }) {
  const nav = useNavigate()
  const corr = rs.find((r) => r.estado === 'corregir')
  const sig = rs.find((r) => r.estado === 'pendiente')
  const rev = rs.find((r) => r.estado === 'revision')
  const final = rs.find((r) => r.id === 'final')
  const objetivo = corr ?? (sig && !(sinAsesor && sig.id === 'preliminar') ? sig : null)
  let ceja = 'Sin entregas abiertas', titulo: ReactNode = 'Esperando a tu asesor', nota = 'Te avisamos cuando se abra la siguiente entrega.'
  if (final?.estado === 'aceptado') { ceja = 'Residencia'; titulo = 'Entregas completas'; nota = 'Tu asesor aceptó los cinco reportes.' }
  else if (objetivo) {
    ceja = corr ? 'Corrección pendiente' : 'Siguiente entrega'
    titulo = <>{objetivo.nombreLargo} · <span className="font-mono text-[16.5px]">{fechaCorta(objetivo.fecha_limite)?.toUpperCase() ?? 'SIN FECHA LÍMITE'}</span></>
    nota = 'PDF o DOCX, hasta 10 MB.'
  } else if (rev) { ceja = 'En revisión'; titulo = rev.nombreLargo; nota = 'Tu asesor lo está revisando. Te avisamos cuando lo haga.' }
  else if (sinAsesor) { ceja = 'Asignación pendiente'; titulo = 'Sin asesor asignado'; nota = 'Podrás entregar tu reporte preliminar cuando Vinculación te asigne asesor.' }
  return (
    <div className="tick grid gap-4 border border-rule bg-ground p-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="font-mono text-[12.5px] uppercase tracking-[.1em] text-ink-3">{ceja}</p>
        <p className="mt-1 text-[18px] font-medium">{titulo}</p>
        <p className="mt-1 text-[14.5px] text-ink-2">{nota}</p>
      </div>
      {objetivo
        ? <Button variant="signal" icon={UploadSimple} onClick={() => nav(objetivo.ruta)}>{corr ? 'Entregar corrección' : 'Ir a entregar'}</Button>
        : <Button variant="ghost" onClick={() => nav('/app/seguimiento')}>Ver seguimiento</Button>}
    </div>
  )
}

const ESTADO_PROYECTO: Record<string, string> = { desarrollo: 'En desarrollo', revision: 'En revisión', completado: 'Completado', pendiente: 'Pendiente', asignado: 'Asignado' }
const FUENTE_SELLO: Record<Fuente['estado'], { tone: Tone; label: string }> = {
  Pendiente: { tone: 'warn', label: 'En validación' }, Validada: { tone: 'ok', label: 'Validada' }, Rechazada: { tone: 'bad', label: 'Rechazada' },
}
const TIPO_FUENTE = { propia: 'Propuesta propia', banco: 'Banco de proyectos', empresa: 'Propuesta de la empresa' }

function CitaFila({ c, yo }: { c: Cita; yo: string }) {
  const personal = String(c.solicitante_id) === String(yo) && String(c.participante_id) === String(yo)
  const con = personal ? 'Cita personal' : c.soy_solicitante ? `Con ${c.participante_nombre} ${c.participante_apellidos}` : `Te invitó ${c.solicitante_nombre} ${c.solicitante_apellidos}`
  const f = new Date(c.fecha_hora)
  const I = c.modalidad === 'Virtual' ? VideoCamera : MapPin
  return (
    <li className="grid gap-1.5 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-medium">{c.motivo || c.tipo}</p>
          <p className="text-[14.5px] text-ink-2">{con}</p>
        </div>
        <Seal tone={c.estado === 'Confirmada' ? 'ok' : 'warn'}>{c.estado}</Seal>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[13.5px] text-ink-2">
        <span className="inline-flex items-center gap-1.5"><CalendarBlank size={14} aria-hidden="true" />
          {f.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', '')} · {f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
        {(c.modalidad || c.lugar) && <span className="inline-flex items-center gap-1.5"><I size={14} aria-hidden="true" />{c.modalidad === 'Virtual' ? 'Virtual' : c.lugar ?? c.modalidad}</span>}
      </p>
    </li>
  )
}

const LineasSkeleton = ({ n = 2 }: { n?: number }) => (
  <div role="status" aria-label="Cargando" className="grid gap-2.5 py-1">{Array.from({ length: n }, (_, i) => <Skeleton key={i} className={`h-4 ${i ? 'w-2/3' : 'w-5/6'}`} />)}</div>
)

export default function Inicio() {
  const u = useUsuario()
  const rep = useReportes()
  const asesor = useAsesor()
  const proyecto = useProyecto()
  const fuente = useFuente()
  const citas = useCitas()
  const sinAsesor = asesor.carga === 'listo' && !asesor.dato
  const aceptados = rep.reportes.filter((r) => r.estado === 'aceptado').length
  const proximas = (citas.dato ?? []).filter((c) => new Date(c.fecha_hora) >= new Date() && c.estado !== 'Cancelada')
    .sort((a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora)).slice(0, 4)

  return (
    <div className="grid gap-10">
      <PageHeader banda eyebrow={hoy()} title={`${saludo()}, ${u.nombre.split(' ')[0]}.`}
        summary={rep.carga === 'cargando' || asesor.carga === 'cargando'
          ? <span className="grid gap-2 pt-1"><Skeleton className="h-4 w-[min(52ch,100%)]" /><Skeleton className="h-4 w-48" /></span>
          : rep.carga === 'error' ? 'No pudimos leer el estado de tus reportes.' : resumen(rep.reportes, sinAsesor)} />

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-12">
          <Section title="Tu expediente" aside={rep.carga === 'listo' && <span className="font-mono text-[12.5px] text-ink-3">{aceptados}/5 aceptados</span>}>
            {rep.carga === 'cargando' ? <RutaSkeleton />
              : rep.carga === 'error' ? <ErrorState message={rep.error ?? 'No pudimos cargar tus reportes.'} onRetry={() => rep.recargar()} />
              : <><RutaReportes reportes={rep.reportes} /><SiguienteAccion rs={rep.reportes} sinAsesor={sinAsesor} /></>}
          </Section>

          <Section title="Mi proyecto">
            {proyecto.carga === 'cargando' ? <LineasSkeleton n={3} />
              : proyecto.carga === 'error' ? <ErrorState message={proyecto.error!} onRetry={proyecto.recargar} />
              : !proyecto.dato ? (
                <EmptyState icon={FolderSimpleDashed} title="No tienes un proyecto asignado">
                  Lo asigna el Jefe de Vinculación. Si ya deberías tener uno, búscalo en la oficina de Vinculación.
                </EmptyState>
              ) : (
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-[22px] font-semibold leading-tight tracking-[-.02em]">{proyecto.dato.titulo}</p>
                      <p className="mt-1 text-[15.5px] text-ink-2">{proyecto.dato.empresa?.nombre ?? 'Sin empresa registrada'}</p>
                    </div>
                    <Seal tone="neutral">{ESTADO_PROYECTO[proyecto.dato.estado] ?? proyecto.dato.estado}</Seal>
                  </div>
                  {proyecto.dato.descripcion && <p className="max-w-[64ch] text-[16.5px] leading-relaxed text-ink-2">{proyecto.dato.descripcion}</p>}
                  {proyecto.dato.tecnologias && (
                    <ul className="flex flex-wrap gap-1.5" aria-label="Tecnologías">
                      {proyecto.dato.tecnologias.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                        <li key={t} className="border border-rule px-2 py-1 font-mono text-[13px] text-ink-2">{t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
          </Section>
        </div>

        <div className="grid content-start gap-12">
          <Section title="Tu asesor">
            {asesor.carga === 'cargando' ? <div className="flex items-center gap-3"><Skeleton className="size-11" /><LineasSkeleton /></div>
              : asesor.carga === 'error' ? <ErrorState message={asesor.error!} onRetry={asesor.recargar} />
              : !asesor.dato ? (
                <EmptyState icon={UserCircleDashed} title="Sin asesor asignado">Vinculación lo asigna. Te avisaremos cuando ocurra.</EmptyState>
              ) : (
                <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center bg-ink font-mono text-[14.5px] font-semibold text-ground">{asesor.dato.iniciales}</span>
                    <div className="min-w-0">
                      <p className="font-medium">{asesor.dato.nombre}</p>
                      <p className="text-[14.5px] text-ink-2">{asesor.dato.departamento || 'Departamento sin registrar'}{asesor.dato.extension && <span className="font-mono text-ink-3"> · {asesor.dato.extension}</span>}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={`mailto:${asesor.dato.correo}`} className="inline-flex min-h-11 min-w-0 items-center gap-2 text-[15.5px] text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                      <EnvelopeSimple size={16} aria-hidden="true" className="shrink-0" /><span className="truncate">{asesor.dato.correo}</span>
                    </a>
                    <CopyButton text={asesor.dato.correo} label="correo del asesor" />
                  </div>
                  <Link to="/app/calendario" className="inline-flex min-h-11 w-fit items-center gap-2 border border-rule-strong px-3.5 text-[15.5px] font-medium hover:bg-ink/5 active:scale-[.98]">
                    <CalendarPlus size={16} aria-hidden="true" />Agendar cita
                  </Link>
                </div>
              )}
          </Section>

          <Section title="Fuente del proyecto">
            {fuente.carga === 'cargando' ? <LineasSkeleton />
              : fuente.carga === 'error' ? <ErrorState message={fuente.error!} onRetry={fuente.recargar} />
              : (
                <Link to="/app/fuente" className="group flex min-h-11 items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-medium">{fuente.dato ? TIPO_FUENTE[fuente.dato.tipo] : 'Sin registrar'}</span>
                    <span className="block text-[14.5px] text-ink-2 group-hover:text-ink">
                      {!fuente.dato ? 'Indica de dónde viene tu proyecto para que Vinculación la valide.'
                        : fuente.dato.estado === 'Rechazada' ? 'Vinculación pidió que la corrijas.'
                        : fuente.dato.estado === 'Pendiente' ? 'Vinculación la está revisando.' : 'Vinculación la validó.'}
                    </span>
                  </span>
                  {fuente.dato ? <Seal tone={FUENTE_SELLO[fuente.dato.estado].tone}>{FUENTE_SELLO[fuente.dato.estado].label}</Seal>
                    : <span className="inline-flex shrink-0 items-center gap-1.5 text-[14.5px] font-medium text-signal-ink"><Signature size={16} aria-hidden="true" />Registrar</span>}
                </Link>
              )}
          </Section>

          <Section title="Próximas citas" aside={<Link to="/app/calendario" className="inline-flex min-h-11 items-center text-[14.5px] text-ink-2 underline-offset-4 hover:text-ink hover:underline">Ver calendario</Link>}>
            {citas.carga === 'cargando' ? <LineasSkeleton n={3} />
              : citas.carga === 'error' ? <ErrorState message={citas.error!} onRetry={citas.recargar} />
              : proximas.length === 0 ? <p className="text-[15.5px] text-ink-2">No tienes citas próximas. Puedes agendar una con tu asesor desde el calendario.</p>
              : <ul className="-mt-3.5 divide-y divide-rule">{proximas.map((c) => <CitaFila key={c.id} c={c} yo={u.id} />)}</ul>}
          </Section>
        </div>
      </div>
    </div>
  )
}
