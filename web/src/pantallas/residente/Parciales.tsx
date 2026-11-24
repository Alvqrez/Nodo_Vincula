/** Organiza los tres parciales y selecciona qué folio mostrar. */

import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { FolderTabs } from '@/components/ui'
import { ErrorState, PageHeader, ReportSeal, Section, Skeleton } from '@/components/app'
import { useReportes, type Reporte } from './reportes'
import { FolioReporte, FolioSkeleton, Guia, resumenReporte } from './piezas'

const ENFOQUE: Record<number, string> = { 1: 'Diagnóstico e inicio', 2: 'Desarrollo del proyecto', 3: 'Avance final y conclusiones' }
const GUIA = ['Actividades realizadas', 'Avance en objetivos', 'Problemas encontrados']
type Tab = 'p1' | 'p2' | 'p3'

/** Pestaña inicial: la que pide acción (corrección, luego pendiente); si no, el último parcial abierto. */
function pestañaInicial(ps: Reporte[]): Tab {
  const n = ps.find((r) => r.estado === 'corregir') ?? ps.find((r) => r.estado === 'pendiente') ?? [...ps].reverse().find((r) => r.estado !== 'bloqueado')
  return `p${n && typeof n.id === 'number' ? n.id : 1}` as Tab
}

export default function Parciales() {
  const rep = useReportes()
  const [params, setParams] = useSearchParams()
  const parciales = useMemo(() => rep.reportes.filter((r) => typeof r.id === 'number'), [rep.reportes])
  const pedido = params.get('p')
  const tab: Tab = pedido === '1' || pedido === '2' || pedido === '3' ? (`p${pedido}` as Tab) : pestañaInicial(parciales)
  const num = Number(tab.slice(1))
  const r = parciales.find((x) => x.id === num)

  // Fija la pestaña elegida en la dirección (el seguimiento enlaza a ?p=n)
  useEffect(() => {
    if (!pedido && rep.carga === 'listo') setParams({ p: String(num) }, { replace: true })
  }, [pedido, rep.carga, num, setParams])

  return (
    <div className="grid gap-10">
      <PageHeader eyebrow="Reportes parciales · 3 bimestres" title={`Reporte parcial ${num}`}
        summary={rep.carga === 'cargando' ? <Skeleton className="mt-1 h-4 w-[min(46ch,100%)]" /> : rep.carga === 'error' ? 'No pudimos leer el estado de tus reportes.' : resumenReporte(r)} />

      {rep.carga === 'error' ? <ErrorState message={rep.error ?? 'No pudimos cargar tus reportes.'} onRetry={() => rep.recargar()} /> : (
        <div className="grid">
          <FolderTabs label="Reportes parciales" value={tab} onChange={(t) => setParams({ p: t.slice(1) })}
            tabs={[1, 2, 3].map((n) => ({ id: `p${n}` as Tab, label: `Parcial ${n}` }))} />
          {/* Las secciones ya son hojas con borde: el panel de la pestaña solo las separa de las pestañas. */}
          <div role="tabpanel" aria-label={`Parcial ${num}`} className="min-w-0 border-t border-rule pt-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8">
              <Section title={`Bimestre ${num} · ${ENFOQUE[num]}`}>
                {rep.carga === 'cargando' || !r ? <FolioSkeleton /> : <FolioReporte reporte={r} entregar={rep.entregar} deshacer={rep.deshacer} />}
              </Section>
              <div className="grid min-w-0 content-start gap-6 lg:gap-8">
                <Section title="Qué debe incluir"><Guia items={GUIA} hechos={r?.estado === 'aceptado'} /></Section>
                <Section title="Tus tres parciales">
                  <ul className="divide-y divide-rule">
                    {rep.carga === 'cargando'
                      ? [1, 2, 3].map((n) => <li key={n} className="flex min-h-11 items-center justify-between py-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-20" /></li>)
                      : parciales.map((p) => (
                        <li key={String(p.id)}>
                          <button type="button" onClick={() => setParams({ p: String(p.id) })} aria-current={p.id === num ? 'true' : undefined}
                            className={`flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-[15.5px] transition-colors hover:text-ink ${p.id === num ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                            {p.nombre}<ReportSeal estado={p.estado} />
                          </button>
                        </li>
                      ))}
                  </ul>
                </Section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
