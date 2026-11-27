/** Proporciona fragmentos de interfaz y elementos gráficos para la portada. */

/**
 * Fragmentos fieles de la interfaz de NODO Vincula, hechos en HTML/CSS.
 * Los nombres vienen de los datos de prueba del seed y van marcados como ejemplo:
 * no son cifras ni personas reales del Tec.
 */
import type { CSSProperties } from 'react'
import { Seal, type Tone } from '@/components/ui'
import { REPORTS } from '@/content'

type Estado = 'aceptado' | 'revision' | 'corregir' | 'pendiente' | 'bloqueado'
const ESTADO: Record<Estado, { label: string; tone: Tone }> = {
  aceptado: { label: 'Aceptado', tone: 'ok' },
  revision: { label: 'En revisión', tone: 'signal' },
  corregir: { label: 'Por corregir', tone: 'bad' },
  pendiente: { label: 'Pendiente', tone: 'warn' },
  bloqueado: { label: 'Por abrir', tone: 'neutral' },
}

/** Etiqueta discreta para todo dato de ejemplo. */
export function Ejemplo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-[.16em] text-ink-3 ${className}`}>Ejemplo</span>
  )
}

/* ── Expediente del residente (marco del héroe) ── */
const EXPEDIENTE: { estado: Estado; fecha: string }[] = [
  { estado: 'aceptado', fecha: '15 FEB' },
  { estado: 'aceptado', fecha: '15 MAR' },
  { estado: 'revision', fecha: '15 ABR' },
  { estado: 'pendiente', fecha: '15 MAY' },
  { estado: 'bloqueado', fecha: '15 JUN' },
]

export function ExpedienteMini() {
  return (
    <div className="grid text-left md:grid-cols-[1.55fr_1fr]">
      {/* Índice del expediente */}
      <div className="border-b border-rule p-5 sm:p-7 md:border-b-0 md:border-r">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[.16em] text-ink-3">Expediente · Ene–Jun 2026</p>
            <p className="mt-1 font-display text-xl font-semibold tracking-[-.02em] text-ink sm:text-2xl">Ana García Mendoza</p>
          </div>
          <Ejemplo />
        </div>
        <p className="mt-1 text-sm text-ink-2">SoftSolutions SA · Ing. en Sistemas de Información</p>

        <RouteLine estados={EXPEDIENTE.map((r) => r.estado)} className="mt-6" />

        <ol className="mt-5 divide-y divide-rule border-y border-rule" aria-label="Reportes del expediente de ejemplo">
          {EXPEDIENTE.map((r, i) => {
            const e = ESTADO[r.estado]
            return (
              <li key={REPORTS[i]} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-2.5 sm:grid-cols-[2.25rem_1fr_4.5rem_auto]">
                <span className="font-mono text-[11px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                <span className={`text-[14px] ${r.estado === 'bloqueado' ? 'text-ink-3' : 'text-ink'}`}>{REPORTS[i]}</span>
                <span className="hidden font-mono text-[11px] text-ink-3 sm:block">{r.fecha}</span>
                <Seal look="stamp" tone={e.tone} stamped delay={1250 + i * 120}>{e.label}</Seal>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Lo siguiente */}
      <div className="grid grid-rows-[auto_auto_1fr] gap-px bg-rule">
        <div className="tick bg-sheet p-5 sm:p-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[.16em] text-ink-3">Siguiente entrega</p>
          <p className="mt-2 text-[15px] font-medium text-ink">Parcial 3</p>
          <p className="mt-1 font-mono text-2xl tracking-tight text-ink">15 MAY 2026</p>
          <p className="mt-2 text-[13px] text-ink-2">Fecha que definió Vinculación para el período.</p>
        </div>
        <div className="bg-sheet p-5 sm:p-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[.16em] text-ink-3">Tu asesor</p>
          <p className="mt-2 text-[15px] font-medium text-ink">Marco Reyes Hernández</p>
          <p className="mt-1 text-[13px] text-ink-2">Revisó tu Parcial 1 con comentarios.</p>
        </div>
        <div className="flex items-center justify-between gap-3 bg-sheet p-5 sm:p-6">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[.16em] text-ink-3">Fuente del proyecto</p>
            <p className="mt-2 text-[15px] font-medium text-ink">Empresa</p>
          </div>
          <Seal look="stamp" tone="ok" stamped delay={1900}>Validada</Seal>
        </div>
      </div>
    </div>
  )
}

/* ── Ruta de cinco estaciones (motivo de trayecto, heredado del concepto A) ── */
export function RouteLine({ estados, className = '' }: { estados: Estado[]; className?: string }) {
  const n = estados.length
  const x = (i: number) => 14 + (i * (472 - 14 * 2 + 14)) / (n - 1)
  const actual = estados.findIndex((e) => e === 'revision' || e === 'pendiente' || e === 'corregir')
  const hasta = actual < 0 ? n - 1 : actual
  return (
    <svg viewBox="0 0 486 52" className={`h-auto w-full overflow-visible ${className}`} role="img"
      aria-label={`Ruta de reportes: ${estados.map((e, i) => `${REPORTS[i]} ${ESTADO[e].label}`).join(', ')}`}>
      <line x1={x(0)} y1="16" x2={x(n - 1)} y2="16" stroke="var(--color-rule-strong)" strokeWidth="2" />
      <line x1={x(0)} y1="16" x2={x(hasta)} y2="16" stroke="var(--color-signal)" strokeWidth="2"
        className="draw" style={{ '--len': 480, '--d': '900ms' } as CSSProperties} />
      {estados.map((e, i) => {
        const cx = x(i)
        if (i === actual) {
          return (
            <g key={i}>
              <circle cx={cx} cy="16" r="9" fill="var(--color-sheet)" stroke="var(--color-signal)" strokeWidth="3" />
              <circle cx={cx} cy="16" r="3.2" fill="var(--color-ink)" />
            </g>
          )
        }
        const done = e === 'aceptado'
        return <circle key={i} cx={cx} cy="16" r="5.5" fill={done ? 'var(--color-ink)' : 'var(--color-sheet)'}
          stroke={done ? 'var(--color-ink)' : 'var(--color-rule-strong)'} strokeWidth="2" />
      })}
      {estados.map((_, i) => (
        <text key={i} x={x(i)} y="46" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          fill="var(--color-ink-3)" style={{ font: '500 10px var(--font-mono)', letterSpacing: '.06em' }}>
          {['PRELIM', 'P1', 'P2', 'P3', 'FINAL'][i]}
        </text>
      ))}
    </svg>
  )
}

/* ── Residente: su ruta ── */
export function ResidenteFragment() {
  return (
    <div className="tick border border-rule bg-sheet p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[.16em] text-ink-3">Tu ruta · Ene–Jun 2026</p>
        <Ejemplo />
      </div>
      <RouteLine estados={['aceptado', 'aceptado', 'revision', 'pendiente', 'bloqueado']} className="mt-5" />
      <div className="mt-5 grid grid-cols-2 gap-px bg-rule">
        <div className="bg-sheet py-3 pr-3">
          <p className="text-[12.5px] text-ink-3">En revisión</p>
          <p className="mt-0.5 text-[15px] font-medium text-ink">Parcial 2</p>
        </div>
        <div className="bg-sheet py-3 pl-4">
          <p className="text-[12.5px] text-ink-3">Fecha límite del Parcial 3</p>
          <p className="mt-0.5 font-mono text-[15px] text-ink">15 MAY 2026</p>
        </div>
      </div>
    </div>
  )
}

/* ── Asesor: bandeja de revisión ── */
const BANDEJA: { nombre: string; reporte: string; espera: string; estado: Estado }[] = [
  { nombre: 'Ana García Mendoza', reporte: 'Parcial 2', espera: 'hace 6 días', estado: 'revision' },
  { nombre: 'Luis Hernández Ruiz', reporte: 'Preliminar', espera: 'hace 3 días', estado: 'revision' },
  { nombre: 'Sofía Martínez López', reporte: 'Parcial 1', espera: 'hace 1 día', estado: 'corregir' },
  { nombre: 'Pedro Ramírez Gómez', reporte: 'Final', espera: '12 nov', estado: 'aceptado' },
]

export function AsesorFragment() {
  return (
    <div className="tick border border-rule bg-sheet">
      <div className="flex items-baseline justify-between gap-3 border-b border-rule px-5 py-3.5 sm:px-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[.16em] text-ink-3">Bandeja de revisión</p>
        <Ejemplo />
      </div>
      <ul className="divide-y divide-rule" aria-label="Bandeja de revisión de ejemplo">
        {BANDEJA.map((r, i) => (
          <li key={r.nombre} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[1fr_auto_auto] sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-ink">{r.nombre}</p>
              <p className="text-[12.5px] text-ink-2">{r.reporte}</p>
            </div>
            <span className="hidden font-mono text-[11px] text-ink-3 sm:block">{r.espera}</span>
            <Seal look="stamp" tone={ESTADO[r.estado].tone} stamped delay={150 + i * 110}>{ESTADO[r.estado].label}</Seal>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Vinculación: matriz de entregas residentes × 5 reportes ── */
const MATRIZ: { nombre: string; fila: Estado[] }[] = [
  { nombre: 'A. García', fila: ['aceptado', 'aceptado', 'revision', 'pendiente', 'bloqueado'] },
  { nombre: 'L. Hernández', fila: ['revision', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado'] },
  { nombre: 'S. Martínez', fila: ['aceptado', 'corregir', 'bloqueado', 'bloqueado', 'bloqueado'] },
  { nombre: 'P. Ramírez', fila: ['aceptado', 'aceptado', 'aceptado', 'aceptado', 'revision'] },
  { nombre: 'D. Flores', fila: ['aceptado', 'aceptado', 'aceptado', 'pendiente', 'bloqueado'] },
]
const CELDA: Record<Estado, string> = {
  aceptado: 'bg-ok', revision: 'bg-signal', corregir: 'bg-bad', pendiente: 'bg-warn', bloqueado: 'bg-ink/10',
}

export function VinculacionFragment() {
  return (
    <div className="tick border border-rule bg-sheet p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[.16em] text-ink-3">Entregas · Ene–Jun 2026</p>
        <Ejemplo />
      </div>
      <table className="mt-4 w-full border-separate border-spacing-[3px] text-left">
        <caption className="sr-only">Matriz de entregas de ejemplo: residentes por reporte</caption>
        <thead>
          <tr>
            <th scope="col" className="w-[38%] font-mono text-[10px] font-medium uppercase tracking-[.1em] text-ink-3">Residente</th>
            {['P', '1', '2', '3', 'F'].map((h) => (
              <th key={h} scope="col" className="text-center font-mono text-[10px] font-medium text-ink-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIZ.map((r) => (
            <tr key={r.nombre}>
              <th scope="row" className="truncate pr-2 text-[13px] font-normal text-ink">{r.nombre}</th>
              {r.fila.map((e, i) => (
                <td key={i} className="p-0">
                  <span className={`block h-6 ${CELDA[e]}`} title={`${REPORTS[i]}: ${ESTADO[e].label}`} />
                  <span className="sr-only">{`${REPORTS[i]}: ${ESTADO[e].label}`}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Leyenda">
        {(['aceptado', 'revision', 'corregir', 'pendiente'] as Estado[]).map((e) => (
          <li key={e} className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
            <span aria-hidden="true" className={`size-2.5 ${CELDA[e]}`} />{ESTADO[e].label}
          </li>
        ))}
      </ul>
    </div>
  )
}
