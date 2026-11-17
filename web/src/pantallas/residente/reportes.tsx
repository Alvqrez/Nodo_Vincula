/**
 * Datos del residente: reportes, asesor, proyecto, fuente y citas.
 * Mismos endpoints y contratos que la app Expo (src/context/ReportesContext.js).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, fileToDataUrl } from '@/lib/api'
import { useSocketEvent } from '@/lib/socket'
import type { EstadoReporte } from '@/components/app'

/* ── Contrato de GET /api/residente/reportes ── */
export type IdReporte = 'preliminar' | 1 | 2 | 3 | 'final'
export type StatusApi = 'Pendiente' | 'En Revisión' | 'Aceptado' | 'Por corregir'
export type ReporteApi = {
  id: IdReporte; title: string; subtitle: string; status: StatusApi
  submitted: string | null; reviewer: string | null; feedback: string | null
  archivo_url: string | null; nombre_archivo: string | null
  fecha_limite: string | null; calificacion: number | null
}
export type Tipo = 'preliminar' | 'parcial1' | 'parcial2' | 'parcial3' | 'final'

export type Reporte = ReporteApi & {
  tipo: Tipo
  /** "Preliminar", "Parcial 1"… */
  nombre: string
  /** "Reporte preliminar", "Reporte parcial 1"… */
  nombreLargo: string
  estado: EstadoReporte
  abierto: boolean
  ruta: string
  motivoBloqueo: string | null
}

const ORDEN: IdReporte[] = ['preliminar', 1, 2, 3, 'final']
export const TIPO_DE: Record<string, Tipo> = { preliminar: 'preliminar', 1: 'parcial1', 2: 'parcial2', 3: 'parcial3', final: 'final' }
const NOMBRE: Record<string, string> = { preliminar: 'Preliminar', 1: 'Parcial 1', 2: 'Parcial 2', 3: 'Parcial 3', final: 'Final' }
export const RUTA_DE: Record<string, string> = {
  preliminar: '/app/reportes/preliminar', 1: '/app/reportes/parciales?p=1', 2: '/app/reportes/parciales?p=2',
  3: '/app/reportes/parciales?p=3', final: '/app/reportes/final',
}

/** Réplica exacta de derivarDesbloqueados (ReportesContext.js). */
function derivarDesbloqueados(rs: ReporteApi[]) {
  const set = new Set<number>()
  if (rs.find((r) => r.id === 'preliminar')?.status === 'Aceptado') set.add(1)
  ;[1, 2, 3].forEach((id) => {
    const r = rs.find((x) => x.id === id)
    if (r?.submitted) set.add(id)
    if (r?.status === 'Aceptado') set.add(id + 1)
  })
  return set
}

export function derivar(rs: ReporteApi[]) {
  const desbloqueados = derivarDesbloqueados(rs)
  const preliminarAprobado = rs.find((r) => r.id === 'preliminar')?.status === 'Aceptado'
  const parciales = rs.filter((r) => typeof r.id === 'number')
  const todosParcialesAprobados = parciales.length > 0 && parciales.every((r) => r.status === 'Aceptado')
  const finalDesbloqueado = preliminarAprobado && todosParcialesAprobados

  const reportes: Reporte[] = ORDEN.map((id) => rs.find((r) => r.id === id)).filter((r): r is ReporteApi => !!r).map((r) => {
    const abierto = r.id === 'preliminar' ? true : r.id === 'final' ? finalDesbloqueado : desbloqueados.has(r.id)
    const estado: EstadoReporte =
      r.status === 'Aceptado' ? 'aceptado' : r.status === 'En Revisión' ? 'revision' : r.status === 'Por corregir' ? 'corregir' : abierto ? 'pendiente' : 'bloqueado'
    let motivoBloqueo: string | null = null
    if (estado === 'bloqueado') {
      if (r.id === 1) motivoBloqueo = 'Se abre cuando tu asesor acepte el reporte preliminar.'
      else if (typeof r.id === 'number') motivoBloqueo = `Se abre cuando tu asesor acepte el Parcial ${r.id - 1}.`
      else {
        const faltan = parciales.filter((p) => p.status !== 'Aceptado').length + (preliminarAprobado ? 0 : 1)
        motivoBloqueo = `Se abre cuando tu asesor acepte el preliminar y los tres parciales. ${faltan === 1 ? 'Falta 1 reporte.' : `Faltan ${faltan} reportes.`}`
      }
    }
    const nombre = NOMBRE[String(r.id)]
    return {
      ...r, tipo: TIPO_DE[String(r.id)], nombre, nombreLargo: `Reporte ${nombre.toLowerCase()}`,
      estado, abierto, ruta: RUTA_DE[String(r.id)], motivoBloqueo,
    }
  })
  return { reportes, preliminarAprobado, todosParcialesAprobados, finalDesbloqueado }
}

type Carga = 'cargando' | 'listo' | 'error'

/** Reportes del residente + entregar / deshacer. Se recargan con los eventos en tiempo real. */
export function useReportes() {
  const [carga, setCarga] = useState<Carga>('cargando')
  const [error, setError] = useState<string | null>(null)
  const [datos, setDatos] = useState<ReporteApi[] | null>(null)
  const vivo = useRef(true)
  useEffect(() => { vivo.current = true; return () => { vivo.current = false } }, [])

  const recargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarga('cargando')
    const r = await api.get<{ reportes: ReporteApi[] }>('/residente/reportes')
    if (!vivo.current) return
    if (r.ok && r.body?.reportes) { setDatos(r.body.reportes); setError(null); setCarga('listo') }
    else if (!silencioso || !datos) { setError(r.error ?? 'No pudimos cargar tus reportes.'); setCarga('error') }
  }, [datos])

  useEffect(() => { recargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // El código anterior buscaba un dbId que nunca se asignaba; recargar es la corrección.
  useSocketEvent('reporte_revisado', () => { recargar(true) })
  useSocketEvent('reporte_desbloqueado', () => { recargar(true) })

  const derivado = useMemo(() => derivar(datos ?? []), [datos])

  /** PUT /api/residente/reportes/:tipo con el archivo en base64. */
  const entregar = useCallback(async (tipo: Tipo, file: File) => {
    let archivo: string
    try { archivo = await fileToDataUrl(file) } catch { return { ok: false, error: 'No pudimos leer el archivo. Vuelve a elegirlo.' } }
    const r = await api.put(`/residente/reportes/${tipo}`, { archivo, nombre_archivo: file.name })
    if (r.ok) await recargar(true)
    return { ok: r.ok, error: r.error }
  }, [recargar])

  /** Deshacer envío: mismo PUT con archivo y nombre en null. */
  const deshacer = useCallback(async (tipo: Tipo) => {
    const r = await api.put(`/residente/reportes/${tipo}`, { archivo: null, nombre_archivo: null })
    if (r.ok) await recargar(true)
    return { ok: r.ok, error: r.error }
  }, [recargar])

  return { carga, error, recargar, entregar, deshacer, ...derivado }
}

/* ── Recursos de solo lectura ── */
export type Asesor = { nombre: string; iniciales: string; correo: string; departamento: string; extension: string }
export type Proyecto = {
  id: string; titulo: string; descripcion: string | null; estado: string; prioridad: string | null; tecnologias: string | null
  empresa: { id: string | null; nombre: string | null; estado: string | null }
}
export type Fuente = {
  id: string; tipo: 'propia' | 'banco' | 'empresa'; descripcion: string; estado: 'Pendiente' | 'Validada' | 'Rechazada'
  observaciones: string | null; revisadoPor: string | null; fechaRevision: string | null
}
export type Cita = {
  id: number; solicitante_id: string; participante_id: string; tipo: string; motivo: string | null; fecha_hora: string; lugar: string | null; modalidad: string | null; estado: string
  solicitante_nombre: string; solicitante_apellidos: string; participante_nombre: string; participante_apellidos: string
  soy_solicitante: boolean
}

/** GET simple con estados de carga y error. `pick` extrae el dato del cuerpo. */
export function useRecurso<T>(path: string, pick: (b: Record<string, unknown>) => T) {
  const [carga, setCarga] = useState<Carga>('cargando')
  const [dato, setDato] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pickRef = useRef(pick)
  const recargar = useCallback(async () => {
    setCarga('cargando')
    const r = await api.get(path)
    if (r.ok && r.body) { setDato(pickRef.current(r.body as Record<string, unknown>)); setError(null); setCarga('listo') }
    else { setError(r.error ?? 'No pudimos cargar esta información.'); setCarga('error') }
  }, [path])
  useEffect(() => { recargar() }, [recargar])
  return { carga, dato, error, recargar }
}

export const useAsesor = () => useRecurso<Asesor | null>('/residente/asesor', (b) => (b.asesor as Asesor) ?? null)
export const useProyecto = () => useRecurso<Proyecto | null>('/residente/proyecto', (b) => (b.proyecto as Proyecto) ?? null)
export const useFuente = () => useRecurso<Fuente | null>('/fuentes/mias', (b) => ((b.fuentes as Fuente[]) ?? [])[0] ?? null)
export const useCitas = () => useRecurso<Cita[]>('/citas/mis-citas', (b) => (b.citas as Cita[]) ?? [])

/* ── Fechas ── */
/** Días desde hoy hasta una fecha yyyy-mm-dd (negativo si ya pasó). */
export function diasHasta(iso: string | null) {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return Math.round((new Date(y, m - 1, d).getTime() - hoy.getTime()) / 86_400_000)
}
export function plazo(iso: string | null) {
  const n = diasHasta(iso)
  if (n === null) return null
  if (n === 0) return 'vence hoy'
  if (n === 1) return 'vence mañana'
  if (n > 1) return `vence en ${n} días`
  return n === -1 ? 'venció ayer' : `venció hace ${-n} días`
}
