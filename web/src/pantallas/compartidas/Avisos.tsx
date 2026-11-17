/**
 * Avisos (antes "Notificaciones"). Mismo comportamiento que src/screens/Notificaciones.js:
 * pestañas por tipo con conteo, grupos por fecha, marca de no leído, marcar uno / todos,
 * eliminar uno / todos los leídos (con confirmación) y botón de acción que lleva a la pantalla.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, BellSimple, Check, Checks, Trash, X } from '@phosphor-icons/react'
import { EmptyState, ErrorState, PageHeader, Section, Skeleton } from '@/components/app'
import { FolderTabs, Seal } from '@/components/ui'
import { useNotificaciones, type Notificacion } from '@/lib/notificaciones'
import { useDialog } from '@/lib/dialog'
import { useUsuario } from '@/lib/session'
import { rutaDeAviso } from '@/app/nav'
import { Accion, IconButton } from './piezas'

type Tab = 'todos' | 'sin-leer' | 'REVISION' | 'AVANCE' | 'SISTEMA'
const TIPO_LABEL: Record<string, string> = { REVISION: 'Revisión', AVANCE: 'Avance', SISTEMA: 'Sistema' }

/** Grupo por fecha relativa, a partir del texto que ya calcula el backend ("Ahora", "Hace 3 h", "Hace 2 días", "4 nov 2026"). */
function grupoDe(time: string) {
  if (time === 'Ahora' || /^Hace \d+ (min|h)$/.test(time)) return 'Hoy'
  const d = Number(time.match(/^Hace (\d+) día/)?.[1])
  if (d === 1) return 'Ayer'
  if (d > 1 && d < 7) return 'Esta semana'
  return 'Anteriores'
}
const ORDEN = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores']
const tiempo = (t: string) => t.replace(/^Hace 1 días$/, 'Hace 1 día')

export default function Avisos() {
  const u = useUsuario()
  const { items, noLeidas, cargando, error, recargar, marcarLeida, marcarTodas, eliminar, eliminarLeidas } = useNotificaciones()
  const { confirm, notify } = useDialog()
  const [tab, setTab] = useState<Tab>('todos')
  const leidas = items.length - noLeidas

  const cuenta = (t: Tab) => (t === 'todos' ? items.length : t === 'sin-leer' ? noLeidas : items.filter((n) => n.type === t).length)
  const tabs: { id: Tab; label: string }[] = [
    { id: 'todos', label: 'Todos' }, { id: 'sin-leer', label: 'Sin leer' },
    { id: 'REVISION', label: 'Revisiones' }, { id: 'AVANCE', label: 'Avances' }, { id: 'SISTEMA', label: 'Sistema' },
  ].map((t) => ({ id: t.id as Tab, label: `${t.label} · ${cuenta(t.id as Tab)}` }))

  const grupos = useMemo(() => {
    const vis = items.filter((n) => (tab === 'todos' ? true : tab === 'sin-leer' ? n.unread : n.type === tab))
    const g = new Map<string, Notificacion[]>()
    vis.forEach((n) => { const k = grupoDe(n.time); g.set(k, [...(g.get(k) ?? []), n]) })
    return ORDEN.filter((k) => g.has(k)).map((k) => ({ label: k, items: g.get(k)! }))
  }, [items, tab])

  const limpiarLeidas = async () => {
    if (leidas === 0) return
    const ok = await confirm({
      title: 'Eliminar avisos leídos',
      message: leidas === 1 ? 'Se eliminará el aviso que ya leíste. Los no leídos se quedan.' : `Se eliminarán los ${leidas} avisos que ya leíste. Los no leídos se quedan.`,
      confirmLabel: 'Eliminar leídos', destructive: true,
    })
    if (!ok) return
    await eliminarLeidas()
    notify({ type: 'success', message: leidas === 1 ? 'Se eliminó 1 aviso leído.' : `Se eliminaron ${leidas} avisos leídos.` })
  }

  const resumen = cargando ? 'Cargando tus avisos…'
    : items.length === 0 ? 'Bandeja vacía por ahora.'
      : noLeidas === 0 ? <>Estás al día: los <span className="font-mono text-ink">{items.length}</span> avisos están leídos.</>
        : <>Tienes <b className="font-semibold text-ink">{noLeidas} sin leer</b> de <span className="font-mono text-ink">{items.length}</span>.</>

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Bandeja" title="Avisos" summary={resumen}
        actions={!cargando && items.length > 0 && (
          <>
            {noLeidas > 0 && <Accion variant="ink" icon={Checks} onClick={() => void marcarTodas()}>Marcar todo como leído</Accion>}
            {leidas > 0 && <Accion icon={Trash} onClick={() => void limpiarLeidas()}>Eliminar leídos</Accion>}
          </>
        )} />

      {error && !cargando && <ErrorState message={error} onRetry={() => void recargar()} />}

      {cargando ? <AvisosEsqueleto /> : !error && items.length === 0 ? <Vacio tab="todos" total={0} onTodos={() => setTab('todos')} /> : !error && (
        <div className="grid">
          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <FolderTabs label="Filtrar avisos" tabs={tabs} value={tab} onChange={setTab} className="w-max" />
          </div>
          <div role="tabpanel" aria-label={tabs.find((t) => t.id === tab)?.label} className="grid gap-10 border-t border-rule pt-8">
            {grupos.length === 0 ? <Vacio tab={tab} total={items.length} onTodos={() => setTab('todos')} /> : grupos.map((g) => (
              <Section key={g.label} title={g.label} aside={<span className="font-mono text-[12.5px] text-ink-3">{g.items.length}</span>}>
                <ul className="-mt-2 divide-y divide-rule">
                  <AnimatePresence initial={false}>
                    {g.items.map((n) => (
                      <Fila key={n.id} n={n} ruta={rutaDeAviso(n.actionScreen, u.rol)}
                        onLeer={() => void marcarLeida(n.id)} onEliminar={() => void eliminar(n.id)} />
                    ))}
                  </AnimatePresence>
                </ul>
              </Section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Un aviso: abrirlo (expandir) lo marca como leído; la acción lleva a su pantalla ── */
function Fila({ n, ruta, onLeer, onEliminar }: { n: Notificacion; ruta: string | null; onLeer: () => void; onEliminar: () => void }) {
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const [abierto, setAbierto] = useState(false)
  const largo = n.body.length > 140
  const abrir = () => { if (n.unread) onLeer(); if (largo) setAbierto((a) => !a) }
  return (
    <motion.li layout={reduce ? false : 'position'} initial={false} exit={{ opacity: 0, x: 32, transition: { duration: 0.22 } }}
      className="grid grid-cols-[14px_1fr] gap-x-3 py-4 sm:grid-cols-[14px_1fr_auto] sm:gap-x-5">
      <span aria-hidden="true" className={`mt-[7px] size-2 ${n.unread ? 'bg-signal' : 'border border-rule-strong'}`} />
      <div className="min-w-0">
        <button type="button" onClick={abrir} aria-expanded={largo ? abierto : undefined}
          className="-mx-2 -my-1 block w-[calc(100%+1rem)] px-2 py-1 text-left transition-colors hover:bg-ink/[.03]">
          <span className="sr-only">{n.unread ? 'Sin leer: ' : ''}</span>
          <span className={`block text-[16.5px] leading-snug ${n.unread ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>{n.title}</span>
          {n.body && <span className={`mt-1 block max-w-[72ch] text-[15.5px] leading-relaxed text-ink-2 ${abierto ? '' : 'line-clamp-2'}`}>{n.body}</span>}
          {largo && <span className="mt-1 block text-[14px] text-ink-3 underline underline-offset-4">{abierto ? 'Ver menos' : 'Ver completo'}</span>}
        </button>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-mono text-[13.5px] text-ink-3">{tiempo(n.time)}</span>
          <Seal tone="neutral">{TIPO_LABEL[n.type] ?? n.type}</Seal>
          {!n.unread && <span className="text-[13.5px] text-ink-3">Leído</span>}
        </p>
      </div>
      <div className="col-start-2 mt-3 flex flex-wrap items-center gap-1.5 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:justify-end sm:self-start">
        {ruta && n.actionLabel && (
          <Accion variant={n.unread ? 'ink' : 'ghost'} icon={ArrowRight} onClick={() => { if (n.unread) onLeer(); nav(ruta) }}>{n.actionLabel}</Accion>
        )}
        {n.unread && <Accion icon={Check} onClick={onLeer} label={`Marcar como leído: ${n.title}`}>Leído</Accion>}
        <IconButton icon={X} tone="danger" label={`Eliminar aviso: ${n.title}`} onClick={onEliminar} />
      </div>
    </motion.li>
  )
}

function Vacio({ tab, total, onTodos }: { tab: Tab; total: number; onTodos: () => void }) {
  if (total === 0) {
    return (
      <EmptyState icon={BellSimple} title="No tienes avisos.">
        Te avisamos aquí cuando revisen un reporte, cambie la fase de un proyecto o alguien te invite a una cita.
      </EmptyState>
    )
  }
  const txt = tab === 'sin-leer' ? 'Estás al día: no tienes avisos sin leer.'
    : `No tienes avisos de ${tab === 'REVISION' ? 'revisión' : tab === 'AVANCE' ? 'avance' : 'sistema'}.`
  return (
    <EmptyState icon={Check} title={txt}
      action={<button type="button" onClick={onTodos} className="min-h-11 text-[15.5px] text-ink underline underline-offset-4 hover:text-signal-ink">Ver todos los avisos</button>} />
  )
}

function AvisosEsqueleto() {
  return (
    <div role="status" aria-label="Cargando avisos" className="grid gap-6">
      <div className="flex gap-1 overflow-hidden">{['w-24', 'w-28', 'w-32', 'w-28', 'w-24'].map((w, i) => <Skeleton key={i} className={`h-11 shrink-0 ${w}`} />)}</div>
      <div className="grid gap-1 border-t border-rule pt-8">
        <Skeleton className="mb-3 h-3 w-16" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[14px_1fr_auto] gap-x-5 border-b border-rule py-4">
            <Skeleton className="mt-1.5 size-2" />
            <div className="grid gap-2"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3.5 w-4/5" /><Skeleton className="mt-1 h-3 w-40" /></div>
            <Skeleton className="hidden h-11 w-28 sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
