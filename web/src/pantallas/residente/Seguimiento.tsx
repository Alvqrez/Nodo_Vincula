import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretDown, Check, DownloadSimple, Printer, UploadSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui'
import { CELDA_REPORTE, ESTADO_REPORTE, ErrorState, MiniButton, PageHeader, ReportSeal, Section, Skeleton, fechaCorta } from '@/components/app'
import { useDialog } from '@/lib/dialog'
import { useUsuario, nombreCompleto } from '@/lib/session'
import { useReportes, type Reporte } from './reportes'
import { ArchivoEnExpediente, Dato, RutaSkeleton, Retro, lineaDeEstado } from './piezas'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const etiqueta = (r: Reporte) => ESTADO_REPORTE[r.estado].label

/* ── Detalle desplegable de un reporte ── */
function Fila({ r, abierto, onToggle, i }: { r: Reporte; abierto: boolean; onToggle: () => void; i: number }) {
  const nav = useNavigate()
  const id = useId()
  const entregable = r.abierto && (r.estado === 'pendiente' || r.estado === 'corregir')
  return (
    <li>
      <h3>
        <button type="button" aria-expanded={abierto} aria-controls={id} onClick={onToggle}
          className="grid min-h-14 w-full grid-cols-[2rem_minmax(0,1fr)_auto_1.25rem] items-center gap-x-4 py-3.5 text-left transition-colors hover:bg-ink/[.03]">
          <span className="font-mono text-[13.5px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>
          <span className="min-w-0">
            <span className={`block text-[16.5px] ${r.estado === 'bloqueado' ? 'text-ink-2' : 'font-medium'}`}>{r.nombreLargo}</span>
            <span className="block truncate text-[14px] font-normal text-ink-3">{lineaDeEstado(r)}</span>
          </span>
          <ReportSeal estado={r.estado} stamped delay={i * 90} />
          <CaretDown size={16} aria-hidden="true" className={`text-ink-3 transition-transform duration-300 ease-[var(--ease-nodo)] ${abierto ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div id={id} role="region" aria-label={`Detalle del ${r.nombreLargo.toLowerCase()}`}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22, ease: [.2, .8, .2, 1] }}
            className="grid gap-5 pb-6 pl-0 sm:pl-12">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Dato label="Fecha límite"><span className="font-mono text-[15.5px]">{fechaCorta(r.fecha_limite) ?? 'Por definir'}</span></Dato>
              <Dato label="Entregado"><span className="font-mono text-[15.5px]">{r.submitted && r.estado !== 'bloqueado' ? r.submitted : '—'}</span></Dato>
              <Dato label="Revisa"><span className="text-[15.5px]">{r.reviewer ?? 'Tu asesor'}</span></Dato>
              <Dato label="Calificación"><span className="font-mono text-[15.5px]">{r.calificacion !== null ? `${r.calificacion}/100` : 'Sin calificar'}</span></Dato>
            </dl>
            {r.feedback ? <Retro reporte={r} /> : r.estado !== 'bloqueado' && <p className="text-[15.5px] text-ink-3">Este reporte todavía no tiene retroalimentación.</p>}
            {r.estado === 'bloqueado' && <p className="text-[15.5px] text-ink-2">{r.motivoBloqueo}</p>}
            {(r.archivo_url || entregable) && (
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                {r.archivo_url ? <ArchivoEnExpediente ruta={r.archivo_url} nombre={r.nombre_archivo} detalle={r.submitted ? `Entregado el ${r.submitted}` : undefined} /> : <span />}
                {entregable && <Button variant="signal" icon={UploadSimple} onClick={() => nav(r.ruta)}>{r.estado === 'corregir' ? 'Entregar corrección' : 'Ir a entregar'}</Button>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export default function Seguimiento() {
  const u = useUsuario()
  const { notify } = useDialog()
  const rep = useReportes()
  const [abierto, setAbierto] = useState<string | null | undefined>(undefined)
  const rs = rep.reportes
  // Al cargar, se despliega el reporte que pide atención (corrección, revisión o el siguiente abierto)
  useEffect(() => {
    if (abierto !== undefined || rep.carga !== 'listo') return
    const foco = rs.find((r) => r.estado === 'corregir') ?? rs.find((r) => r.estado === 'revision') ?? rs.find((r) => r.estado === 'pendiente')
    setAbierto(foco ? String(foco.id) : null)
  }, [abierto, rep.carga, rs])
  const aceptados = rs.filter((r) => r.estado === 'aceptado').length
  const parcialesAceptados = rs.filter((r) => typeof r.id === 'number' && r.estado === 'aceptado').length
  const listo = rep.carga === 'listo'

  /* Resumen imprimible (window.print), como la app anterior */
  const imprimir = () => {
    const filas = rs.map((r) => `<tr><td>${esc(r.nombreLargo)}</td><td>${esc(etiqueta(r))}</td><td>${esc(fechaCorta(r.fecha_limite) ?? 'Por definir')}</td><td>${esc(r.submitted && r.estado !== 'bloqueado' ? r.submitted : 'Sin entregar')}</td><td>${esc(r.calificacion ?? '—')}</td><td>${esc(r.reviewer ?? '')}</td></tr>`).join('')
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Seguimiento de reportes</title><style>body{font-family:system-ui,sans-serif;padding:32px;color:#0E1014}h1{font-size:22px;margin:0 0 4px}p{margin:0;color:#3A3F48}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}th,td{border-bottom:1px solid #ccc;padding:10px 8px;text-align:left}th{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#5B606A}</style></head><body><h1>Seguimiento de reportes</h1><p>${esc(nombreCompleto(u))} · ${aceptados} de 5 aceptados · ${esc(new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }))}</p><table><thead><tr><th>Reporte</th><th>Estado</th><th>Límite</th><th>Entrega</th><th>Calificación</th><th>Revisa</th></tr></thead><tbody>${filas}</tbody></table></body></html>`
    const win = window.open('', '_blank')
    if (!win) { notify({ type: 'warning', title: 'No se abrió el resumen', message: 'El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio e intenta de nuevo.' }); return }
    win.document.write(html); win.document.close(); win.focus(); win.print()
  }
  /* CSV de la tabla "Mis reportes" del inicio anterior (ahora con los 5 reportes) */
  const csv = () => {
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const filas = [['Reporte', 'Límite', 'Entrega', 'Estado', 'Calificación'], ...rs.map((r) => [r.nombreLargo, fechaCorta(r.fecha_limite) ?? 'Por definir', r.submitted && r.estado !== 'bloqueado' ? r.submitted : '—', etiqueta(r), r.calificacion ?? ''])]
    const blob = new Blob(['﻿' + filas.map((f) => f.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mis_reportes.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  }

  const final = rs.find((r) => r.id === 'final')
  const resumen = !listo ? null
    : final?.estado === 'aceptado' ? 'Tu asesor aceptó los cinco reportes. Terminaste las entregas.'
    : rep.finalDesbloqueado ? `${aceptados} de 5 reportes aceptados. El reporte final ya está abierto.`
    : `${aceptados} de 5 reportes aceptados. El reporte final se abre cuando tu asesor acepte el preliminar y los tres parciales.`

  return (
    <div className="grid gap-10">
      <PageHeader eyebrow="Tus cinco reportes" title="Seguimiento"
        summary={rep.carga === 'cargando' ? <Skeleton className="mt-1 h-4 w-[min(48ch,100%)]" /> : rep.carga === 'error' ? 'No pudimos leer el estado de tus reportes.' : resumen}
        actions={listo && (
          <>
            <MiniButton variant="ghost" onClick={imprimir}><Printer size={16} aria-hidden="true" />Imprimir resumen</MiniButton>
            <MiniButton variant="ghost" onClick={csv}><DownloadSimple size={16} aria-hidden="true" />Descargar CSV</MiniButton>
          </>
        )} />

      {rep.carga === 'error' ? <ErrorState message={rep.error ?? 'No pudimos cargar tus reportes.'} onRetry={() => rep.recargar()} /> : (
        <>
          {/* Progreso: una celda por reporte, en el color de su estado */}
          <section aria-labelledby="prog" className="grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="prog" className="font-mono text-[12.5px] font-medium uppercase tracking-[.1em] text-ink-2">Avance</h2>
              {listo && <span className="font-mono text-[13.5px] text-ink-2">{aceptados}/5 · parciales {parcialesAceptados}/3</span>}
            </div>
            {listo ? (
              <ol className="grid grid-cols-5 gap-1" aria-label={rs.map((r) => `${r.nombre}: ${etiqueta(r)}`).join(', ')}>
                {rs.map((r) => (
                  <li key={String(r.id)} className="grid gap-2">
                    <span aria-hidden="true" className={`h-2.5 ${CELDA_REPORTE[r.estado]}`} />
                    <span className="truncate text-[13.5px] text-ink-2"><span className="hidden sm:inline">{r.nombre} · </span><span className="sm:hidden">{r.id === 'preliminar' ? 'Prel.' : r.id === 'final' ? 'Final' : `P${r.id}`}</span><span className="hidden sm:inline">{etiqueta(r).toLowerCase()}</span></span>
                  </li>
                ))}
              </ol>
            ) : <div role="status" aria-label="Cargando avance" className="grid grid-cols-5 gap-1">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-2.5" />)}</div>}
          </section>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Section title="Detalle por reporte" aside={listo && <span className="hidden font-mono text-[12.5px] text-ink-3 sm:block">Toca un reporte para ver su detalle</span>}>
              {!listo ? <RutaSkeleton /> : (
                <ul className="divide-y divide-rule">
                  {rs.map((r, i) => <Fila key={String(r.id)} r={r} i={i} abierto={abierto === String(r.id)} onToggle={() => setAbierto((a) => (a === String(r.id) ? null : String(r.id)))} />)}
                </ul>
              )}
            </Section>

            <Section title="Para abrir el reporte final">
              {!listo ? <div className="grid gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5" />)}</div> : (
                <div className="grid gap-4">
                  <ul className="divide-y divide-rule border-b border-rule">
                    {rs.filter((r) => r.id !== 'final').map((r) => {
                      const ok = r.estado === 'aceptado'
                      return (
                        <li key={String(r.id)} className="flex min-h-11 items-center gap-3 py-2 text-[15.5px]">
                          <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center border ${ok ? 'border-ok bg-ok text-sheet' : 'border-rule-strong'}`}>{ok && <Check size={12} weight="bold" />}</span>
                          <span className={`flex-1 ${ok ? '' : 'text-ink-2'}`}>{r.nombreLargo} aceptado</span>
                          <span className="sr-only">{ok ? 'cumplido' : 'pendiente'}</span>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="text-[15px] leading-relaxed text-ink-2">
                    {rep.finalDesbloqueado
                      ? <>Cumpliste los requisitos. El reporte final está <span className="font-medium text-ink">{final ? etiqueta(final).toLowerCase() : 'abierto'}</span>.</>
                      : 'Tu asesor revisa cada reporte; al aceptar uno, se abre el siguiente.'}
                  </p>
                </div>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  )
}
