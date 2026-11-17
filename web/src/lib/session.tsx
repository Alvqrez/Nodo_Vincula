import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setToken, getToken } from './api'

export type Rol = 'residente' | 'asesor' | 'jefe'
export type Usuario = {
  id: string; nombre: string; apellidos: string; correo: string; rol: Rol
  asesorInfo?: { usuarioId: string; nombre: string; correo: string; departamento: string; numEmpleado: string }
  jefeInfo?: { usuarioId: string; nombre: string; correo: string }
  residentesInfo?: { usuarioId: string; nombre: string; correo: string; numControl: string; carrera: string; horasCompletadas: number; horasRequeridas: number; empresa: string }[]
}
type Estado = 'cargando' | 'anonimo' | 'dentro'
type Resultado = { ok: boolean; mensaje?: string }

const LAST_KEY = 'vt_last_user_info'
const Ctx = createContext<{
  estado: Estado; usuario: Usuario | null; avisoAcceso: string | null
  entrar: (correo: string, password: string) => Promise<Resultado>
  salir: () => void
  limpiarAviso: () => void
  desdeNodo: boolean
  consumirNodo: () => void
} | null>(null)

/** Lee ?nodo_code= (entrada desde NODO) y lo borra de la dirección: no debe quedar en el historial. */
function leerCodigoNodo() {
  try {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('nodo_code')
    if (!code) return null
    url.searchParams.delete('nodo_code')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    return code
  } catch { return null }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [avisoAcceso, setAviso] = useState<string | null>(null)
  /** true tras procesar una entrada desde NODO: la app debe llevar a /app o a /acceso. */
  const [desdeNodo, setDesdeNodo] = useState(false)

  const completar = useCallback((t: string, u: Usuario) => {
    setToken(t)
    setUsuario(u)
    setEstado('dentro')
    setAviso(null)
    try { localStorage.setItem(LAST_KEY, JSON.stringify({ id: u.id, nombre: u.nombre, rol: u.rol })) } catch { /* sin almacenamiento */ }
  }, [])

  // Al abrir: código de NODO, o sesión guardada validada con /auth/me.
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const code = leerCodigoNodo()
      if (code) {
        const r = await api.post<{ token: string; usuario: Usuario }>('/auth/nodo', { code })
        if (!vivo) return
        if (r.ok && r.body?.token) completar(r.body.token, r.body.usuario)
        else { setAviso(r.error ?? 'No pudimos entrar con tu cuenta de NODO.'); setEstado('anonimo') }
        setDesdeNodo(true)
        return
      }
      if (!getToken()) { setEstado('anonimo'); return }
      const r = await api.get<{ usuario: Usuario }>('/auth/me')
      if (!vivo) return
      if (r.ok && r.body?.usuario) { setUsuario(r.body.usuario); setEstado('dentro'); return }
      // Token vencido, inválido o cuenta inactiva: se borra. Sin conexión: se conserva para reintentar.
      if ([401, 403, 404].includes(r.status)) setToken(null)
      else if (r.status === 0) setAviso(r.error ?? null)
      setEstado('anonimo')
    })()
    return () => { vivo = false }
  }, [completar])

  const salir = useCallback(() => { setToken(null); setUsuario(null); setEstado('anonimo') }, [])

  // Un 401 en cualquier petición de la app: la sesión venció.
  useEffect(() => {
    const on = () => { setAviso('Tu sesión venció. Vuelve a entrar.'); salir() }
    window.addEventListener('vincula:sesion-vencida', on)
    return () => window.removeEventListener('vincula:sesion-vencida', on)
  }, [salir])

  const entrar = useCallback(async (correo: string, password: string): Promise<Resultado> => {
    const r = await api.post<{ token: string; usuario: Usuario }>('/auth/login', { correo, password })
    if (r.ok && r.body?.token) { completar(r.body.token, r.body.usuario); return { ok: true } }
    return { ok: false, mensaje: r.error }
  }, [completar])

  return (
    <Ctx.Provider value={{ estado, usuario, avisoAcceso, entrar, salir, limpiarAviso: () => setAviso(null), desdeNodo, consumirNodo: () => setDesdeNodo(false) }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSession() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSession debe usarse dentro de SessionProvider')
  return c
}

/** El usuario autenticado (solo dentro de /app, donde ya se garantizó la sesión). */
export function useUsuario(): Usuario {
  const { usuario } = useSession()
  if (!usuario) throw new Error('Sin sesión')
  return usuario
}

export function ultimoUsuario(): { nombre: string; rol: Rol } | null {
  try { const v = localStorage.getItem(LAST_KEY); return v ? JSON.parse(v) : null } catch { return null }
}
export function olvidarUltimoUsuario() { try { localStorage.removeItem(LAST_KEY) } catch { /* sin almacenamiento */ } }

export const ROL_LABEL: Record<Rol, string> = { residente: 'Residente', asesor: 'Asesor', jefe: 'Jefatura de Vinculación' }
export const nombreCompleto = (u: Pick<Usuario, 'nombre' | 'apellidos'>) => `${u.nombre} ${u.apellidos}`.trim()
export const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
