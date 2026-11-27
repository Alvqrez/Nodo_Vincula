/** Agrupa la carga y actualización de avisos de la cuenta en el cliente web. */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import { useSocketEvent } from './socket'

/** Forma que devuelve GET /api/notificaciones (sin cambios respecto a la app Expo). */
export type Notificacion = {
  id: number | string; icon: string; title: string; body: string; time: string; unread: boolean
  type: 'REVISION' | 'AVANCE' | 'SISTEMA' | string; proyecto: string | null; fase: string | null
  actionScreen: string | null; actionLabel: string | null; metadata: Record<string, unknown> | null
}

const Ctx = createContext<{
  items: Notificacion[]; noLeidas: number; cargando: boolean; error: string | null
  recargar: () => Promise<void>; marcarLeida: (id: Notificacion['id']) => Promise<void>; marcarTodas: () => Promise<void>
  eliminar: (id: Notificacion['id']) => Promise<void>; eliminarLeidas: () => Promise<void>
} | null>(null)

export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notificacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    const r = await api.get<{ notificaciones: Notificacion[] }>('/notificaciones')
    if (r.ok) { setItems(r.body?.notificaciones ?? []); setError(null) } else setError(r.error ?? null)
    setCargando(false)
  }, [])
  useEffect(() => { void recargar() }, [recargar])
  // Llegan en tiempo real; se recarga de la base para tener el objeto completo.
  useSocketEvent('notificacion_nueva', () => { void recargar() })

  const marcarLeida = async (id: Notificacion['id']) => {
    setItems((p) => p.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    const r = await api.put(`/notificaciones/${id}/read`)
    if (!r.ok) setItems((p) => p.map((n) => (n.id === id ? { ...n, unread: true } : n)))
  }
  const marcarTodas = async () => {
    setItems((p) => p.map((n) => ({ ...n, unread: false })))
    const r = await api.put('/notificaciones/marcar-todas-leidas')
    if (!r.ok) void recargar()
  }
  const eliminar = async (id: Notificacion['id']) => {
    setItems((p) => p.filter((n) => n.id !== id))
    const r = await api.delete(`/notificaciones/${id}`)
    if (!r.ok) void recargar()
  }
  const eliminarLeidas = async () => {
    setItems((p) => p.filter((n) => n.unread))
    const r = await api.delete('/notificaciones/todas-leidas')
    if (!r.ok) void recargar()
  }

  return (
    <Ctx.Provider value={{ items, noLeidas: items.filter((n) => n.unread).length, cargando, error, recargar, marcarLeida, marcarTodas, eliminar, eliminarLeidas }}>
      {children}
    </Ctx.Provider>
  )
}

export function useNotificaciones() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useNotificaciones debe usarse dentro de NotificacionesProvider')
  return c
}
