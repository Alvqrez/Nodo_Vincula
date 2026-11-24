/** Configura el folio del reporte final y muestra sus condiciones de apertura. */

import { Check } from '@phosphor-icons/react'
import { Seal } from '@/components/ui'
import { CELDA_REPORTE, ESTADO_REPORTE, ErrorState, PageHeader, ReportSeal, Section, Skeleton, fechaCorta } from '@/components/app'
import { nombreCompleto, useUsuario } from '@/lib/session'
import { useAsesor, useProyecto, useReportes } from './reportes'
import { Dato, FolioReporte, FolioSkeleton, resumenReporte } from './piezas'

// Apartados requeridos del reporte final (plantilla institucional, no datos de la BD)
const APARTADOS = [
  'Portada e identificación', 'Índice de contenidos', 'Resumen ejecutivo', 'Introducción y justificación',
  'Marco teórico', 'Descripción del problema', 'Objetivos específicos', 'Metodología aplicada',
  'Resultados obtenidos', 'Análisis y discusión', 'Conclusiones', 'Bibliografía y anexos',
]
// Ponderación institucional; el asesor solo registra la calificación total
const RUBRICA = [
  { label: 'Contenido técnico', peso: 40 }, { label: 'Redacción y estilo', peso: 20 }, { label: 'Evidencias y anexos', peso: 20 },
  { label: 'Formato y presentación', peso: 10 }, { label: 'Originalidad', peso: 10 },
]

export default function Final() {
  const u = useUsuario()
  const rep = useReportes()
  const asesor = useAsesor()
  const proyecto = useProyecto()
  const r = rep.reportes.find((x) => x.id === 'final')
  const listo = rep.carga === 'listo' && !!r
  const entregado = r?.estado === 'revision' || r?.estado === 'aceptado'
  const calificado = r?.calificacion !== null && r?.calificacion !== undefined ? Math.round(r.calificacion) : null

  return (
    <div className="grid gap-10">
      <PageHeader eyebrow="Informe de cierre" title="Reporte final"
        summary={rep.carga === 'cargando' ? <Skeleton className="mt-1 h-4 w-[min(46ch,100%)]" /> : rep.carga === 'error' ? 'No pudimos leer el estado de tu reporte.' : resumenReporte(r)} />

      {/* Ficha del expediente */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-5">
        <Dato label="Proyecto" className="col-span-2 sm:col-span-3 xl:col-span-2">
          {proyecto.carga === 'cargando' ? <Skeleton className="h-5 w-56 max-w-full" /> : proyecto.dato?.titulo ?? <span className="text-ink-2">Sin proyecto asignado</span>}
        </Dato>
        <Dato label="Empresa">{proyecto.carga === 'cargando' ? <Skeleton className="h-5 w-28" /> : proyecto.dato?.empresa?.nombre ?? '—'}</Dato>
        <Dato label="Asesor">{asesor.carga === 'cargando' ? <Skeleton className="h-5 w-28" /> : asesor.dato?.nombre ?? 'Sin asignar'}</Dato>
        <Dato label="Residente">{nombreCompleto(u)}</Dato>
      </dl>

      {rep.carga === 'error' ? <ErrorState message={rep.error ?? 'No pudimos cargar tu reporte.'} onRetry={() => rep.recargar()} /> : (
        <>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Section title="Entrega">
              {!listo ? <FolioSkeleton /> : <FolioReporte reporte={r!} entregar={rep.entregar} deshacer={rep.deshacer} />}
            </Section>

            <Section title={rep.finalDesbloqueado ? 'Línea de tiempo' : 'Requisitos para abrirlo'}>
              {!listo ? <div className="grid gap-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9" />)}</div> : (
                <ol className="relative grid">
                  {rep.reportes.map((x, i) => {
                    const fecha = x.id === 'final' && !entregado
                      ? (x.fecha_limite ? `Límite ${fechaCorta(x.fecha_limite)}` : 'Límite por definir')
                      : x.submitted && x.estado !== 'bloqueado' && x.estado !== 'pendiente' ? `Entregado ${x.submitted}`
                      : x.estado === 'pendiente' && x.nombre_archivo && x.submitted ? `Archivo del ${x.submitted}` : 'Sin entregar'
                    const ultimo = i === rep.reportes.length - 1
                    return (
                      <li key={String(x.id)} className="relative grid grid-cols-[1.25rem_1fr_auto] items-start gap-x-3 pb-5 last:pb-0">
                        {!ultimo && <span aria-hidden="true" className="absolute bottom-0 left-[9px] top-5 w-px bg-rule-strong" />}
                        <span aria-hidden="true" className={`mt-1 size-[19px] ${CELDA_REPORTE[x.estado]} ${x.estado === 'bloqueado' ? 'border border-rule-strong' : ''}`} />
                        <span className="min-w-0">
                          <span className={`block text-[16px] ${x.id === 'final' ? 'font-semibold' : 'font-medium'}`}>{x.nombreLargo}</span>
                          <span className="block font-mono text-[13.5px] text-ink-3">{fecha}</span>
                        </span>
                        {x.id === 'final' || !rep.finalDesbloqueado
                          ? <ReportSeal estado={x.estado} />
                          : <span className="font-mono text-[12.5px] uppercase tracking-[.1em] text-ink-3">{ESTADO_REPORTE[x.estado].label}</span>}
                      </li>
                    )
                  })}
                </ol>
              )}
            </Section>
          </div>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Section title="Contenido · 12 apartados" aside={<span className="font-mono text-[12.5px] text-ink-3">{entregado ? '12/12 en tu entrega' : 'revisa antes de entregar'}</span>}>
              <ol className="grid gap-x-8 border-t border-rule sm:grid-cols-2">
                {APARTADOS.map((t, i) => (
                  <li key={t} className="flex min-h-11 items-center gap-3 border-b border-rule py-2 text-[15.5px]">
                    <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center border ${entregado ? 'border-ok bg-ok text-sheet' : 'border-rule-strong font-mono text-[12px] text-ink-3'}`}>
                      {entregado ? <Check size={12} weight="bold" /> : i + 1}
                    </span>
                    <span className={entregado ? '' : 'text-ink-2'}>{t}</span>
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="Rúbrica" aside={calificado !== null ? <Seal tone="ok">{calificado}/100</Seal> : <Seal tone="neutral">Sin calificar</Seal>}>
              <ul className="grid gap-3.5">
                {RUBRICA.map((c) => (
                  <li key={c.label} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-[15.5px]">
                      <span>{c.label}</span><span className="font-mono text-[13.5px] text-ink-2">peso {c.peso} %</span>
                    </div>
                    <span aria-hidden="true" className="block h-1 bg-ink/8"><span className="block h-full bg-ink/45" style={{ width: `${c.peso}%` }} /></span>
                  </li>
                ))}
              </ul>
              <p className="text-[14.5px] leading-relaxed text-ink-3">
                {calificado !== null
                  ? 'Calificación total que registró tu asesor al aceptar el reporte final. No hay puntaje por criterio.'
                  : 'Tu asesor registra la calificación total cuando acepta el reporte final; no asigna puntos por criterio.'}
              </p>
            </Section>
          </div>
        </>
      )}
    </div>
  )
}
