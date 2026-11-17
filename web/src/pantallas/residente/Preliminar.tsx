import { ErrorState, PageHeader, Section, Skeleton } from '@/components/app'
import { useAsesor, useProyecto, useReportes } from './reportes'
import { Dato, FolioReporte, FolioSkeleton, Guia, resumenReporte } from './piezas'

const GUIA = ['Datos del proyecto', 'Objetivos', 'Plan de trabajo', 'Cronograma']

export default function Preliminar() {
  const rep = useReportes()
  const asesor = useAsesor()
  const proyecto = useProyecto()
  const r = rep.reportes.find((x) => x.id === 'preliminar')
  // Igual que la app anterior: sin asesor asignado no se puede entregar el preliminar.
  const sinAsesor = asesor.carga === 'listo' && !asesor.dato
  const bloqueo = sinAsesor && r && r.estado !== 'aceptado' && r.estado !== 'revision'
    ? { titulo: 'Sin asesor asignado', texto: 'No puedes entregar tu reporte preliminar hasta que el Jefe de Vinculación te asigne un asesor. Contáctalo para que haga la asignación.' }
    : null
  const cargando = rep.carga === 'cargando' || asesor.carga === 'cargando'

  return (
    <div className="grid gap-10">
      <PageHeader eyebrow="Formato ITV-AC-PO-004-A01" title="Reporte preliminar"
        summary={cargando ? <Skeleton className="mt-1 h-4 w-[min(46ch,100%)]" /> : rep.carga === 'error' ? 'No pudimos leer el estado de tu reporte.' : resumenReporte(r, bloqueo ? 'Aún no tienes asesor asignado; podrás entregarlo cuando Vinculación te asigne uno.' : null)} />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section title="Entrega">
          {rep.carga === 'error' ? <ErrorState message={rep.error ?? 'No pudimos cargar tu reporte.'} onRetry={() => rep.recargar()} />
            : cargando || !r ? <FolioSkeleton />
            : <FolioReporte reporte={r} entregar={rep.entregar} deshacer={rep.deshacer} bloqueo={bloqueo} />}
        </Section>

        <div className="grid content-start gap-12">
          <Section title="Datos del proyecto">
            {proyecto.carga === 'cargando' || asesor.carga === 'cargando' ? <div className="grid gap-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-3/5" /></div>
              : proyecto.carga === 'error' ? <ErrorState message={proyecto.error!} onRetry={proyecto.recargar} />
              : (
                <dl className="grid gap-4">
                  <Dato label="Proyecto">{proyecto.dato?.titulo ?? <span className="text-ink-2">Sin proyecto asignado</span>}</Dato>
                  <Dato label="Empresa">{proyecto.dato?.empresa?.nombre ?? <span className="text-ink-2">Sin empresa registrada</span>}</Dato>
                  <Dato label="Asesor">{asesor.dato?.nombre ?? <span className="text-ink-2">Sin asignar</span>}</Dato>
                  <p className="text-[14px] leading-relaxed text-ink-3">Estos datos vienen de tu asignación. Si alguno es incorrecto, avisa a Vinculación.</p>
                </dl>
              )}
          </Section>
          <Section title="Qué debe incluir">
            <Guia items={GUIA} hechos={r?.estado === 'aceptado'} />
          </Section>
        </div>
      </div>
    </div>
  )
}
