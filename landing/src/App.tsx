import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router'
import { Lockup } from '@/components/brand'
import { Button } from '@/components/ui'

const Landing = lazy(() => import('@/landing/Landing'))
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

export default function App() {
  return (
    <>
      <div aria-hidden="true" className="grain" />
      <Suspense fallback={<div className="min-h-[100dvh]" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/prototipo/*" element={<Prototipo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
