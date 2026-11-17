/**
 * Cartografía de NODO dentro del expediente: curvas de nivel generadas (deterministas).
 * Es textura, no contenido: aria-hidden y sin eventos.
 */
import { memo } from 'react'

function rng(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
}

/** Contornos concéntricos irregulares alrededor de un "cerro" (cx, cy en % del lienzo). */
function contornos(seed: number, n: number, cx: number, cy: number) {
  const r = rng(seed)
  const armonicos = Array.from({ length: 4 }, (_, k) => ({ a: (r() * 0.18) / (k + 1), f: k + 2, p: r() * Math.PI * 2 }))
  return Array.from({ length: n }, (_, i) => {
    const base = 26 + i * 34
    const pts = Array.from({ length: 72 }, (_, j) => {
      const t = (j / 72) * Math.PI * 2
      const d = 1 + armonicos.reduce((s, h) => s + h.a * Math.sin(h.f * t + h.p + i * 0.35), 0)
      return [cx + Math.cos(t) * base * d * 1.35, cy + Math.sin(t) * base * d]
    })
    return `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`
  })
}

export const Topo = memo(function Topo({ seed = 7, className = '', rings = 9, cx = 520, cy = 140 }: { seed?: number; className?: string; rings?: number; cx?: number; cy?: number }) {
  const paths = contornos(seed, rings, cx, cy)
  return (
    <svg aria-hidden="true" viewBox="0 0 800 300" preserveAspectRatio="xMaxYMid slice" className={`pointer-events-none ${className}`}>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={i % 4 === 0 ? 1.2 : 0.7} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
})
