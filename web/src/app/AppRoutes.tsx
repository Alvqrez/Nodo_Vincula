import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { Hammer } from '@phosphor-icons/react'
import AppShell from './AppShell'
import { EmptyState, PageHeader, SkeletonRows } from '@/components/app'
import { NotificacionesProvider } from '@/lib/notificaciones'
import { SocketProvider } from '@/lib/socket'
import { useSession, type Rol } from '@/lib/session'

const p = {
  residenteInicio: lazy(() => import('@/pantallas/residente/Inicio')),
  seguimiento: lazy(() => import('@/pantallas/residente/Seguimiento')),
  fuente: lazy(() => import('@/pantallas/residente/Fuente')),
  preliminar: lazy(() => import('@/pantallas/residente/Preliminar')),
  parciales: lazy(() => import('@/pantallas/residente/Parciales')),
  final: lazy(() => import('@/pantallas/residente/Final')),
  avisos: lazy(() => import('@/pantallas/compartidas/Avisos')),
  calendario: lazy(() => import('@/pantallas/compartidas/Calendario')),
  perfil: lazy(() => import('@/pantallas/compartidas/Perfil')),
}

/** Secciones de Asesor y Vinculación que se rediseñan en las siguientes entregas. */
function EnRediseno({ titulo }: { titulo: string }) {
  return (
    <div className="grid gap-8">
      <PageHeader title={titulo} />
      <EmptyState icon={Hammer} title="Esta sección se está rediseñando.">
        Llega en la siguiente entrega. Mientras tanto, úsala en la app actual de NODO Vincula.
      </EmptyState>
    </div>
  )
}

const RUTAS: Record<Rol, { path: string; el: ReactNode }[]> = {
  residente: [
    { path: '', el: <p.residenteInicio /> },
    { path: 'seguimiento', el: <p.seguimiento /> },
    { path: 'fuente', el: <p.fuente /> },
    { path: 'reportes', el: <Navigate to="/app/reportes/preliminar" replace /> },
    { path: 'reportes/preliminar', el: <p.preliminar /> },
    { path: 'reportes/parciales', el: <p.parciales /> },
    { path: 'reportes/final', el: <p.final /> },
  ],
  asesor: [
    { path: '', el: <EnRediseno titulo="Inicio" /> },
    { path: 'proyectos', el: <EnRediseno titulo="Proyectos" /> },
    { path: 'revision', el: <EnRediseno titulo="Revisión" /> },
  ],
  jefe: [
    { path: '', el: <EnRediseno titulo="Inicio" /> },
    ...[['empresas', 'Empresas'], ['proyectos', 'Proyectos'], ['asignacion', 'Asignación'], ['seguimiento', 'Seguimiento'], ['fuentes', 'Fuentes'], ['estadisticas', 'Estadísticas'], ['administracion', 'Administración']]
      .map(([path, t]) => ({ path, el: <EnRediseno titulo={t} /> })),
  ],
}
const COMPARTIDAS = [
  { path: 'avisos', el: <p.avisos /> },
  { path: 'calendario', el: <p.calendario /> },
  { path: 'perfil', el: <p.perfil /> },
]

/** /app/*: exige sesión; cada rol solo ve sus rutas (los permisos reales los aplica el backend). */
export default function AppRoutes() {
  const { estado, usuario } = useSession()
  const location = useLocation()
  if (estado === 'cargando') return <div className="mx-auto max-w-3xl p-10"><SkeletonRows rows={5} label="Abriendo tu expediente" /></div>
  if (estado !== 'dentro' || !usuario) return <Navigate to="/acceso" replace state={{ desde: location.pathname }} />
  return (
    <SocketProvider usuario={usuario}>
      <NotificacionesProvider>
        <AppShell>
          <Suspense fallback={<SkeletonRows rows={5} />}>
            <Routes>
              {[...RUTAS[usuario.rol], ...COMPARTIDAS].map((r) => <Route key={r.path || 'inicio'} path={r.path} element={r.el} index={r.path === ''} />)}
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </Suspense>
        </AppShell>
      </NotificacionesProvider>
    </SocketProvider>
  )
}
