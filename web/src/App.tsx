import { lazy, Suspense, useEffect } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router'
import { useSession } from '@/lib/session'
import { Lockup } from '@/components/brand'
import { Button } from '@/components/ui'

const Landing = lazy(() => import('@/landing/Landing'))
const Acceso = lazy(() => import('@/app/Acceso'))
const AppRoutes = lazy(() => import('@/app/AppRoutes'))
const Prototipo = lazy(() => import('@/prototipo/Prototipo'))

function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-start justify-center gap-6 px-4 sm:px-8">
      <Link to="/" aria-label="Inicio"><Lockup /></Link>
      <p className="font-mono text-xs uppercase tracking-[.18em] text-ink-3">Error 404</p>
      <h1 className="font-display text-5xl font-semibold tracking-[-.035em]">Esta hoja no está en el expediente.</h1>
      <p className="max-w-[52ch] text-ink-2">La dirección no existe o se movió.</p>
      <Button href="/">Volver al inicio</Button>
    </main>
  )
}

/** Entrada desde NODO (?nodo_code=): adentro → /app; si falló → /acceso con el motivo. */
function SalidaNodo() {
  const { desdeNodo, consumirNodo, estado } = useSession()
  const nav = useNavigate()
  useEffect(() => {
    if (!desdeNodo || estado === 'cargando') return
    consumirNodo()
    nav(estado === 'dentro' ? '/app' : '/acceso', { replace: true })
  }, [desdeNodo, estado, consumirNodo, nav])
  return null
}

export default function App() {
  return (
    <>
      <SalidaNodo />
      <div aria-hidden="true" className="grain" />
      <Suspense fallback={<div className="min-h-[100dvh]" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/acceso" element={<Acceso />} />
          <Route path="/app/*" element={<AppRoutes />} />
          <Route path="/prototipo/*" element={<Prototipo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
