/** Contiene los datos ficticios que usa el prototipo. */

/**
 * Datos de EJEMPLO para el prototipo. Nombres, empresas y proyectos vienen del seed
 * del backend (backend/seed.js). Fechas y estados son ilustrativos: el "hoy" del
 * prototipo es el lunes 18 de mayo de 2026, a mitad del período Ene–Jun 2026.
 */
import type { Tone } from '@/components/ui'

export const HOY = 'Lunes 18 de mayo de 2026'
export const PERIODO = 'Ene–Jun 2026'

export type Estado = 'aceptado' | 'revision' | 'corregir' | 'pendiente' | 'bloqueado'

export const ESTADO: Record<Estado, { label: string; tone: Tone; help: string }> = {
  aceptado: { label: 'Aceptado', tone: 'ok', help: 'Tu asesor lo aprobó.' },
  revision: { label: 'En revisión', tone: 'signal', help: 'Entregado; tu asesor lo está revisando.' },
  corregir: { label: 'Por corregir', tone: 'bad', help: 'Tu asesor pidió cambios.' },
  pendiente: { label: 'Pendiente', tone: 'warn', help: 'Abierto; aún no lo entregas.' },
  bloqueado: { label: 'Bloqueado', tone: 'neutral', help: 'Se abre al aceptar el anterior.' },
}

export const REPORTES = ['Preliminar', 'Parcial 1', 'Parcial 2', 'Parcial 3', 'Final'] as const
/** Fechas límite que Vinculación capturó para el período (ilustrativas). */
export const LIMITES = ['20 feb', '27 mar', '15 may', '5 jun', '26 jun'] as const

export type Reporte = { nombre: (typeof REPORTES)[number]; limite: string; entregado?: string; estado: Estado; nota?: string }

/** Expediente de Ana García Mendoza en cada escenario del prototipo. */
export const EXPEDIENTE_ANA: Record<'revision' | 'corregir', Reporte[]> = {
  revision: [
    { nombre: 'Preliminar', limite: '20 feb', entregado: '19 feb', estado: 'aceptado' },
    { nombre: 'Parcial 1', limite: '27 mar', entregado: '26 mar', estado: 'aceptado', nota: 'Aceptado tras una corrección' },
    { nombre: 'Parcial 2', limite: '15 may', entregado: '15 may', estado: 'revision' },
    { nombre: 'Parcial 3', limite: '5 jun', estado: 'bloqueado' },
    { nombre: 'Final', limite: '26 jun', estado: 'bloqueado' },
  ],
  corregir: [
    { nombre: 'Preliminar', limite: '20 feb', entregado: '19 feb', estado: 'aceptado' },
    { nombre: 'Parcial 1', limite: '27 mar', entregado: '26 mar', estado: 'aceptado', nota: 'Aceptado tras una corrección' },
    { nombre: 'Parcial 2', limite: '15 may', entregado: '15 may', estado: 'corregir' },
    { nombre: 'Parcial 3', limite: '5 jun', estado: 'bloqueado' },
    { nombre: 'Final', limite: '26 jun', estado: 'bloqueado' },
  ],
}

export const FEEDBACK_P2 = 'Falta profundidad en algunos aspectos. Revisar la justificación.'

export const RESIDENTE = {
  nombre: 'Ana García Mendoza',
  pila: 'Ana',
  carrera: 'Ing. en Sistemas de Información',
  proyecto: 'Sistema de Gestión de Inventarios',
  empresa: 'SoftSolutions SA',
  fase: 'Desarrollo',
  asesor: { nombre: 'Marco Reyes Hernández', depto: 'Sistemas y Computación' },
}

export type Cita = { id: string; con: string; tipo: string; cuando: string; modalidad: 'Virtual' | 'Presencial'; estado: 'Pendiente' | 'Confirmada'; invitacion?: boolean }

export const CITAS_RESIDENTE: Cita[] = [
  { id: 'c1', con: 'Marco Reyes Hernández', tipo: 'Revisión de avances', cuando: 'Mié 20 may · 11:00', modalidad: 'Virtual', estado: 'Pendiente', invitacion: true },
  { id: 'c2', con: 'Marco Reyes Hernández', tipo: 'Asesoría', cuando: 'Mar 2 jun · 9:30', modalidad: 'Presencial', estado: 'Confirmada' },
]

/* ── Asesor ─────────────────────────────────────────────────────────────── */
export type Entrega = {
  id: string; residente: string; empresa: string; proyecto: string; reporte: (typeof REPORTES)[number]
  llego: string; dias: number; archivo: string; peso: string
}

export const BANDEJA: Entrega[] = [
  { id: 'e1', residente: 'Sofía Martínez López', empresa: 'DataCore MX', proyecto: 'Dashboard Analytics en Tiempo Real', reporte: 'Parcial 2', llego: '12 may', dias: 6, archivo: 'parcial2_martinez.pdf', peso: '2.4 MB' },
  { id: 'e2', residente: 'Ana García Mendoza', empresa: 'SoftSolutions SA', proyecto: 'Sistema de Gestión de Inventarios', reporte: 'Parcial 2', llego: '15 may', dias: 3, archivo: 'parcial2_garcia.pdf', peso: '1.7 MB' },
  { id: 'e3', residente: 'Carmen López Herrera', empresa: 'RedMovil MX', proyecto: 'Portal de Estudiantes', reporte: 'Final', llego: '17 may', dias: 1, archivo: 'reporte_final_lopez.docx', peso: '6.3 MB' },
]

export const CRITERIOS = [
  'Cumple con los objetivos del proyecto',
  'Aprobación del diagnóstico empresarial',
  'Cumple con el plan de trabajo',
]

export const MIS_RESIDENTES: { nombre: string; empresa: string; ruta: Estado[]; ultimo: string }[] = [
  { nombre: 'Ana García Mendoza', empresa: 'SoftSolutions SA', ruta: ['aceptado', 'aceptado', 'revision', 'bloqueado', 'bloqueado'], ultimo: 'Entregó Parcial 2 · 15 may' },
  { nombre: 'Sofía Martínez López', empresa: 'DataCore MX', ruta: ['aceptado', 'aceptado', 'revision', 'bloqueado', 'bloqueado'], ultimo: 'Entregó Parcial 2 · 12 may' },
  { nombre: 'Carmen López Herrera', empresa: 'RedMovil MX', ruta: ['aceptado', 'aceptado', 'aceptado', 'aceptado', 'revision'], ultimo: 'Entregó el Final · 17 may' },
  { nombre: 'Diana Flores Gutiérrez', empresa: 'EcoEnergía Verde', ruta: ['aceptado', 'corregir', 'bloqueado', 'bloqueado', 'bloqueado'], ultimo: 'Corrige Parcial 1 desde 8 may' },
]

export const CITAS_ASESOR: Cita[] = [
  { id: 'a1', con: 'Ana García Mendoza', tipo: 'Revisión de avances', cuando: 'Mié 20 may · 11:00', modalidad: 'Virtual', estado: 'Pendiente' },
  { id: 'a2', con: 'Diana Flores Gutiérrez', tipo: 'Asesoría', cuando: 'Jue 21 may · 13:30', modalidad: 'Presencial', estado: 'Confirmada' },
]

/* ── Vinculación ────────────────────────────────────────────────────────── */
export const MATRIZ: Record<'actual' | 'anterior', { residente: string; asesor: string; ruta: Estado[] }[]> = {
  actual: [
    { residente: 'Ana García Mendoza', asesor: 'M. Reyes', ruta: ['aceptado', 'aceptado', 'revision', 'bloqueado', 'bloqueado'] },
    { residente: 'Sofía Martínez López', asesor: 'M. Reyes', ruta: ['aceptado', 'aceptado', 'revision', 'bloqueado', 'bloqueado'] },
    { residente: 'Carmen López Herrera', asesor: 'M. Reyes', ruta: ['aceptado', 'aceptado', 'aceptado', 'aceptado', 'revision'] },
    { residente: 'Diana Flores Gutiérrez', asesor: 'M. Reyes', ruta: ['aceptado', 'corregir', 'bloqueado', 'bloqueado', 'bloqueado'] },
    { residente: 'Luis Hernández Ruiz', asesor: 'L. Vega', ruta: ['aceptado', 'aceptado', 'aceptado', 'pendiente', 'bloqueado'] },
    { residente: 'Pedro Ramírez Gómez', asesor: 'L. Vega', ruta: ['aceptado', 'aceptado', 'pendiente', 'bloqueado', 'bloqueado'] },
    { residente: 'Miguel Torres Castillo', asesor: 'L. Vega', ruta: ['aceptado', 'revision', 'bloqueado', 'bloqueado', 'bloqueado'] },
    { residente: 'Roberto Sánchez Vidal', asesor: 'Sin asesor', ruta: ['pendiente', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado'] },
  ],
  /** El seed no tiene residentes en Ago–Dic 2025: sirve para mostrar el estado vacío. */
  anterior: [],
}

export const AVANCES = [
  { id: 'v1', proyecto: 'Dashboard Analytics en Tiempo Real', asesor: 'Laura Vega Jiménez', de: 'Revisión', a: 'Concluido', desde: 'hace 2 días' },
  { id: 'v2', proyecto: 'Sistema de Gestión de Inventarios', asesor: 'Marco Reyes Hernández', de: 'Desarrollo', a: 'Revisión', desde: 'hace 4 días' },
]

export const FUENTES = [
  { id: 'f1', residente: 'Luis Hernández Ruiz', tipo: 'Empresa', texto: 'Proyecto propuesto por DataCore MX para su área de reportes.' },
  { id: 'f2', residente: 'Miguel Torres Castillo', tipo: 'Banco de proyectos', texto: 'Monitoreo de riego para TecnoAgro del Norte.' },
]

export const CONVENIOS = [
  { id: 'k1', empresa: 'SoftSolutions SA', vence: '12 jun 2026', dias: 25, residentes: 2 },
  { id: 'k2', empresa: 'TecnoAgro del Norte', vence: '30 jun 2026', dias: 43, residentes: 1 },
]

export const SIN_ASESOR = [{ id: 's1', residente: 'Roberto Sánchez Vidal', carrera: 'Ing. Electrónica', empresa: 'SoftSolutions SA' }]
