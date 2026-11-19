/**
 * Piezas compartidas por las pantallas del residente: ruta de reportes,
 * zona de archivo (arrastrar y soltar) y el folio de un reporte con su entrega.
 */
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowSquareOut, ArrowUUpLeft, FileDoc, FilePdf, LockSimple, PaperPlaneTilt, UploadSimple, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui'
import { ESTADO_REPORTE, MiniButton, ReportSeal, Skeleton, fechaCorta } from '@/components/app'
import { abrirArchivo } from '@/lib/api'
import { useDialog } from '@/lib/dialog'
import { plazo, type Reporte, type Tipo } from './reportes'

/* ── Fila de dato: etiqueta en mono arriba, valor abajo ── */
export function Dato({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`grid content-start gap-1 ${className}`}>
      <dt className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-3">{label}</dt>
      <dd className="text-[16.5px]">{children}</dd>
    </div>
  )
}

/** Línea breve bajo el nombre del reporte, según su estado real. */
export function lineaDeEstado(r: Reporte) {
  switch (r.estado) {
    case 'corregir': return r.feedback ? `Tu asesor: “${r.feedback}”` : ESTADO_REPORTE.corregir.help
    case 'bloqueado': return r.motivoBloqueo ?? ESTADO_REPORTE.bloqueado.help
    case 'revision': return r.submitted ? `Entregado el ${r.submitted}. Tu asesor lo está revisando.` : ESTADO_REPORTE.revision.help
    case 'aceptado': return r.calificacion !== null ? `Aceptado con ${r.calificacion}/100.` : r.submitted ? `Entregado el ${r.submitted}.` : ESTADO_REPORTE.aceptado.help
    default: {
      const p = plazo(r.fecha_limite)
      return r.nombre_archivo ? 'Hay un archivo en tu expediente; puedes entregar una versión nueva.' : p ? `Abierto; ${p}.` : ESTADO_REPORTE.pendiente.help
    }
  }
}

/** Frase de encabezado de la pantalla de un reporte. */
export function resumenReporte(r: Reporte | undefined, bloqueo?: string | null): ReactNode {
  if (!r) return null
  if (bloqueo) return bloqueo
  const f = fechaCorta(r.fecha_limite)
  const p = plazo(r.fecha_limite)
  switch (r.estado) {
    case 'bloqueado': return r.motivoBloqueo
    case 'revision': return <>Lo entregaste el <span className="font-mono text-ink">{r.submitted}</span>. Tu asesor lo está revisando.</>
    case 'corregir': return <>Tu asesor pidió cambios. Lee su retroalimentación y entrega el archivo corregido{f ? <> antes del <span className="font-mono text-ink">{f}</span></> : ''}.</>
    case 'aceptado': return <>Tu asesor lo aceptó{r.calificacion !== null ? <> con <span className="font-mono text-ink">{r.calificacion}/100</span></> : ''}. No necesitas hacer nada más con este reporte.</>
    default: return f ? <>Está abierto. Entrégalo antes del <span className="font-mono text-ink">{f}</span>{p?.startsWith('venció') ? ` (${p})` : ''}.</> : 'Está abierto. Tu asesor aún no define la fecha límite.'
  }
}

/* ── Índice del expediente: los 5 reportes con su sello ── */
export function RutaReportes({ reportes, onSelect }: { reportes: Reporte[]; onSelect?: (r: Reporte) => void }) {
  return (
    <ol className="divide-y divide-rule">
      {reportes.map((r, i) => {
        const cuerpo = (
          <>
            <span className="font-mono text-[13.5px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>
            <span className="min-w-0">
              <span className={`block text-[16.5px] ${r.estado === 'bloqueado' ? 'text-ink-2' : 'font-medium'}`}>{r.nombre}</span>
              <span className="line-clamp-2 block text-[14px] text-ink-3">{lineaDeEstado(r)}</span>
            </span>
            <span className="hidden font-mono text-[13.5px] text-ink-2 sm:block">
              {r.fecha_limite ? <>límite {fechaCorta(r.fecha_limite)}</> : 'límite por definir'}
            </span>
            <span className="justify-self-end"><ReportSeal estado={r.estado} /></span>
          </>
        )
        const cls = 'grid min-h-14 w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3.5 text-left transition-colors hover:bg-ink/[.03] sm:grid-cols-[2rem_minmax(0,1fr)_9rem_7.5rem]'
        return (
          <li key={String(r.id)}>
            {onSelect
              ? <button type="button" onClick={() => onSelect(r)} className={cls}>{cuerpo}</button>
              : <Link to={r.ruta} className={cls} aria-label={`${r.nombreLargo}: ${ESTADO_REPORTE[r.estado].label}`}>{cuerpo}</Link>}
          </li>
        )
      })}
    </ol>
  )
}

export function RutaSkeleton() {
  return (
    <div role="status" aria-label="Cargando tus reportes" className="divide-y divide-rule">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 py-4 sm:grid-cols-[2rem_1fr_9rem_auto]">
          <Skeleton className="h-3" /><span className="grid gap-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-56 max-w-full" /></span>
          <Skeleton className="hidden h-3 sm:block" /><Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  )
}

/* ── Validación de archivo: PDF o DOCX, hasta 10 MB, contenido acorde a la extensión ── */
export const MAX_MB = 10
export async function validarArchivo(f: File): Promise<string | null> {
  const ext = f.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? ''
  if (ext === '.doc') return 'Los archivos .doc no se aceptan. Guárdalo como .docx o PDF.'
  if (ext !== '.pdf' && ext !== '.docx') return 'Solo se aceptan archivos PDF o DOCX.'
  if (f.size === 0) return 'El archivo está vacío.'
  if (f.size > MAX_MB * 1024 * 1024) return `El archivo pesa ${(f.size / 1048576).toFixed(1)} MB; el máximo es ${MAX_MB} MB.`
  try {
    const b = new Uint8Array(await f.slice(0, 4).arrayBuffer())
    const pdf = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46
    const zip = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04
    if (ext === '.pdf' && !pdf) return 'El archivo dice ser PDF, pero su contenido no lo es. Expórtalo de nuevo como PDF.'
    if (ext === '.docx' && !zip) return 'El archivo dice ser DOCX, pero su contenido no lo es. Guárdalo de nuevo desde Word.'
  } catch { return 'No pudimos leer el archivo. Vuelve a elegirlo.' }
  return null
}
const peso = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`)
const IconoArchivo = ({ nombre, size = 20 }: { nombre: string; size?: number }) =>
  nombre.toLowerCase().endsWith('.pdf') ? <FilePdf size={size} weight="light" aria-hidden="true" /> : <FileDoc size={size} weight="light" aria-hidden="true" />

/* ── Zona de archivo: arrastrar y soltar + botón; etiqueta arriba, error abajo ── */
export function ZonaArchivo({ archivo, onArchivo, error, onError, disabled, label = 'Archivo del reporte' }:
  { archivo: File | null; onArchivo: (f: File | null) => void; error: string | null; onError: (e: string | null) => void; disabled?: boolean; label?: string }) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [sobre, setSobre] = useState(false)
  const elegir = async (f: File | undefined | null) => {
    if (!f) return
    const e = await validarArchivo(f)
    if (e) { onError(e); onArchivo(null); return }
    onError(null); onArchivo(f)
  }
  const drop = (e: DragEvent) => { e.preventDefault(); setSobre(false); if (!disabled) elegir(e.dataTransfer.files?.[0]) }
  return (
    <div className="grid gap-2">
      <p id={`${id}-l`} className="text-[15.5px] font-medium">{label}</p>
      <input ref={input} id={id} type="file" tabIndex={-1} className="sr-only" aria-labelledby={`${id}-l`}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = '' }} disabled={disabled} />
      {archivo ? (
        <div className="flex flex-wrap items-center gap-3 border border-rule-strong bg-ground px-4 py-3">
          <span className="text-ink-2"><IconoArchivo nombre={archivo.name} size={24} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-[14.5px]">{archivo.name}</span>
            <span className="block font-mono text-[13px] text-ink-3">{peso(archivo.size)} · listo para entregar</span>
          </span>
          <MiniButton variant="ghost" onClick={() => input.current?.click()} disabled={disabled}>Cambiar</MiniButton>
          <button type="button" onClick={() => onArchivo(null)} disabled={disabled} aria-label="Quitar archivo"
            className="grid size-10 place-items-center text-ink-2 hover:text-ink disabled:opacity-50"><X size={16} /></button>
        </div>
      ) : (
        <div onDragEnter={(e) => { e.preventDefault(); if (!disabled) setSobre(true) }} onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(false) }} onDrop={drop}
          aria-describedby={`${id}-h`}
          className={`grid justify-items-start gap-3 border border-dashed px-5 py-6 transition-colors duration-200 sm:grid-cols-[auto_1fr_auto] sm:items-center
            ${error ? 'border-bad' : sobre ? 'border-signal bg-signal/5' : 'border-rule-strong'}`}>
          <span aria-hidden="true" className={`grid size-11 place-items-center bg-tray transition-transform duration-200 ${sobre ? '-translate-y-0.5 text-signal-ink' : 'text-ink-2'}`}>
            <UploadSimple size={20} />
          </span>
          <span>
            <span className="block text-[16.5px] font-medium">{sobre ? 'Suelta el archivo para cargarlo' : 'Arrastra tu archivo aquí'}</span>
            <span id={`${id}-h`} className="block text-[14.5px] text-ink-3">PDF o DOCX, hasta {MAX_MB} MB.</span>
          </span>
          <MiniButton variant="ghost" onClick={() => input.current?.click()} disabled={disabled}>Elegir archivo</MiniButton>
        </div>
      )}
      {error && <p role="alert" className="text-[14.5px] text-bad">{error}</p>}
    </div>
  )
}

/* ── Archivo ya en el expediente (protegido: se abre con el token) ── */
export function ArchivoEnExpediente({ ruta, nombre, detalle }: { ruta: string; nombre: string | null; detalle?: ReactNode }) {
  const { notify } = useDialog()
  const n = nombre ?? ruta.split('/').pop() ?? 'archivo'
  return (
    <button type="button" onClick={() => abrirArchivo(ruta, n).catch((e: Error) => notify({ type: 'error', title: 'No se abrió el archivo', message: e.message }))}
      className="group flex min-h-12 w-full items-center gap-3 border border-rule px-4 py-2.5 text-left transition-colors hover:border-rule-strong active:scale-[.99]">
      <span className="text-ink-2"><IconoArchivo nombre={n} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[14.5px]">{n}</span>
        {detalle && <span className="block text-[13.5px] text-ink-3">{detalle}</span>}
      </span>
      <span className="inline-flex items-center gap-1.5 text-[14.5px] text-ink-2 group-hover:text-ink">Abrir<ArrowSquareOut size={15} aria-hidden="true" /></span>
    </button>
  )
}

/* ── Retroalimentación del asesor ── */
export function Retro({ reporte }: { reporte: Reporte }) {
  if (!reporte.feedback) return null
  const borde = reporte.estado === 'corregir' ? 'border-bad' : reporte.estado === 'aceptado' ? 'border-ok' : 'border-rule-strong'
  return (
    <figure className={`grid gap-1.5 border-l-2 ${borde} bg-ground py-3 pl-4 pr-3`}>
      <figcaption className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-3">Retroalimentación · {reporte.reviewer ?? 'tu asesor'}</figcaption>
      <blockquote className="text-[16.5px] leading-relaxed">{reporte.feedback}</blockquote>
    </figure>
  )
}

/* ── Folio del reporte: estado, fechas, retroalimentación, archivo y entrega ── */
type Accion = (tipo: Tipo, f: File) => Promise<{ ok: boolean; error?: string }>
type Deshacer = (tipo: Tipo) => Promise<{ ok: boolean; error?: string }>

export function FolioReporte({ reporte: r, entregar, deshacer, bloqueo }:
  { reporte: Reporte; entregar: Accion; deshacer: Deshacer; bloqueo?: { titulo: string; texto: ReactNode } | null }) {
  const { confirm, notify } = useDialog()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [quitando, setQuitando] = useState(false)
  const [recien, setRecien] = useState(0) // segundos para deshacer al instante
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])
  // Al cambiar de reporte se limpia la selección
  useEffect(() => { setArchivo(null); setError(null); setRecien(0); if (timer.current) clearInterval(timer.current) }, [r.tipo])

  const bloqueado = r.estado === 'bloqueado' || !!bloqueo
  const puedeEntregar = !bloqueado && (r.estado === 'pendiente' || r.estado === 'corregir')
  const p = plazo(r.fecha_limite)

  const enviar = async () => {
    if (!archivo) { setError('Elige el archivo del reporte antes de entregarlo.'); return }
    setEnviando(true)
    const res = await entregar(r.tipo, archivo)
    setEnviando(false)
    if (!res.ok) { setError(res.error ?? 'No se pudo entregar el reporte.'); return }
    setArchivo(null); setError(null)
    notify({ type: 'success', title: `${r.nombreLargo} entregado`, message: 'Tu asesor lo recibe en su bandeja y te avisaremos cuando lo revise.', duration: 5000 })
    setRecien(8)
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => setRecien((s) => { if (s <= 1 && timer.current) clearInterval(timer.current); return Math.max(0, s - 1) }), 1000)
  }

  const quitar = async (preguntar: boolean) => {
    if (preguntar && !(await confirm({
      title: 'Deshacer envío',
      message: 'Se quitará el archivo y el reporte volverá a quedar pendiente. Tu asesor ya no lo verá en su bandeja. Podrás entregarlo de nuevo.',
      confirmLabel: 'Deshacer envío', destructive: true,
    }))) return
    if (timer.current) clearInterval(timer.current)
    setRecien(0); setQuitando(true)
    const res = await deshacer(r.tipo)
    setQuitando(false)
    notify(res.ok ? { type: 'success', title: 'Envío deshecho', message: 'Puedes volver a entregar tu reporte.' }
      : { type: 'error', title: 'No se pudo deshacer el envío', message: res.error ?? 'Intenta de nuevo.' })
  }

  return (
    <div className="grid gap-6">
      {/* Estado y fechas */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-rule pb-5 pt-1 sm:grid-cols-[auto_1fr_1fr]">
        <Dato label="Estado" className="col-span-2 sm:col-span-1">
          <span className="flex min-h-7 items-center"><ReportSeal key={r.estado} estado={bloqueo ? 'bloqueado' : r.estado} stamped /></span>
        </Dato>
        <Dato label="Fecha límite">
          <span className="font-mono text-[15.5px]">{fechaCorta(r.fecha_limite) ?? 'Por definir'}</span>
          {p && puedeEntregar && <span className={`block text-[14px] ${(p.startsWith('venció') ? 'text-bad' : 'text-ink-3')}`}>{p[0].toUpperCase() + p.slice(1)}</span>}
        </Dato>
        <Dato label={r.estado === 'pendiente' && r.nombre_archivo ? 'Último archivo' : 'Entregado'}>
          <span className="font-mono text-[15.5px]">{r.submitted && r.estado !== 'bloqueado' ? r.submitted : '—'}</span>
          {r.calificacion !== null && <span className="block text-[14px] text-ink-3">Calificación {r.calificacion}/100</span>}
        </Dato>
      </dl>

      <Retro reporte={r} />

      {/* Deshacer inmediato tras entregar */}
      <AnimatePresence>
        {recien > 0 && r.estado === 'revision' && (
          <motion.div role="status" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="tick flex flex-wrap items-center gap-3 border border-rule bg-ground px-4 py-3">
            <span className="flex-1 text-[15.5px]">Entregado. ¿Te equivocaste de archivo?</span>
            <MiniButton variant="ghost" onClick={() => quitar(false)} disabled={quitando}>
              <ArrowUUpLeft size={15} aria-hidden="true" />Deshacer <span className="font-mono text-[13.5px] text-ink-3">{recien} s</span>
            </MiniButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Según el estado */}
      {bloqueado ? (
        <div className="grid justify-items-start gap-2 border border-dashed border-rule-strong p-6">
          <LockSimple size={24} weight="light" className="text-ink-3" aria-hidden="true" />
          <p className="font-medium">{bloqueo?.titulo ?? `${r.nombreLargo} bloqueado`}</p>
          <p className="max-w-[56ch] text-[15.5px] leading-relaxed text-ink-2">{bloqueo?.texto ?? r.motivoBloqueo}</p>
        </div>
      ) : r.estado === 'revision' ? (
        <div className="grid gap-4">
          {r.archivo_url && <ArchivoEnExpediente ruta={r.archivo_url} nombre={r.nombre_archivo} detalle={r.submitted ? `Entregado el ${r.submitted}` : undefined} />}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[52ch] text-[15.5px] text-ink-2">Tu asesor lo está revisando. Mientras no lo revise, puedes deshacer el envío para cambiar el archivo.</p>
            {recien === 0 && (
              <MiniButton variant="danger" onClick={() => quitar(true)} disabled={quitando}>
                <ArrowUUpLeft size={15} aria-hidden="true" />{quitando ? 'Deshaciendo…' : 'Deshacer envío'}
              </MiniButton>
            )}
          </div>
        </div>
      ) : r.estado === 'aceptado' ? (
        <div className="grid gap-4">
          {r.archivo_url && <ArchivoEnExpediente ruta={r.archivo_url} nombre={r.nombre_archivo} detalle={r.submitted ? `Entregado el ${r.submitted}` : undefined} />}
          <p className="text-[15.5px] text-ink-2">Tu asesor aceptó este reporte. Ya no se puede cambiar el archivo.</p>
        </div>
      ) : (
        <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); enviar() }} noValidate>
          {r.archivo_url && (
            <div className="grid gap-2">
              <p className="text-[15.5px] font-medium">{r.estado === 'corregir' ? 'Versión que revisó tu asesor' : 'Archivo en tu expediente'}</p>
              <ArchivoEnExpediente ruta={r.archivo_url} nombre={r.nombre_archivo} detalle={r.submitted ? `Del ${r.submitted}` : undefined} />
            </div>
          )}
          <ZonaArchivo archivo={archivo} onArchivo={setArchivo} error={error} onError={setError} disabled={enviando}
            label={r.estado === 'corregir' ? 'Archivo corregido' : 'Archivo del reporte'} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="signal" icon={PaperPlaneTilt} disabled={enviando}>
              {enviando ? 'Entregando…' : r.estado === 'corregir' ? 'Entregar corrección' : `Entregar ${r.nombreLargo.toLowerCase()}`}
            </Button>
            <p className="text-[14.5px] text-ink-3">Tu asesor recibe un aviso al entregarlo.</p>
          </div>
        </form>
      )}
    </div>
  )
}

export function FolioSkeleton() {
  return (
    <div role="status" aria-label="Cargando el reporte" className="grid gap-6">
      <div className="grid grid-cols-3 gap-6 border-b border-rule pb-5 pt-1">
        {[0, 1, 2].map((i) => <span key={i} className="grid gap-2"><Skeleton className="h-2.5 w-16" /><Skeleton className="h-5 w-24" /></span>)}
      </div>
      <Skeleton className="h-28" />
      <Skeleton className="h-11 w-48" />
    </div>
  )
}

/* ── Guía de contenido (plantilla institucional, no datos del alumno) ── */
export function Guia({ titulo = 'Qué debe incluir', items, hechos }: { titulo?: string; items: string[]; hechos?: boolean }) {
  return (
    <ol className="-mt-2 divide-y divide-rule border-b border-rule" aria-label={titulo}>
      {items.map((t, i) => (
        <li key={t} className="flex min-h-11 items-center gap-3 py-2 text-[15.5px]">
          <span className={`font-mono text-[13px] ${hechos ? 'text-ok' : 'text-ink-3'}`}>{String(i + 1).padStart(2, '0')}</span>
          <span className={hechos ? 'text-ink' : 'text-ink-2'}>{t}</span>
        </li>
      ))}
    </ol>
  )
}
