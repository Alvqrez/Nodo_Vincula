import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { API_ROOT } from './api'

type Handler = (data: any) => void // eslint-disable-line @typescript-eslint/no-explicit-any
const Ctx = createContext<{ subscribe: (event: string, h: Handler) => () => void } | null>(null)

/** Tiempo real (Socket.IO). Los suscriptores se registran aunque el socket aún no exista. */
export function SocketProvider({ usuario, children }: { usuario: { id: string; rol: string } | null; children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null)
  const handlers = useRef(new Map<string, Set<Handler>>())

  useEffect(() => {
    if (!usuario) return
    const s = io(API_ROOT, { withCredentials: true, reconnectionAttempts: 5, reconnectionDelay: 3000, timeout: 10000 })
    socketRef.current = s
    handlers.current.forEach((set, ev) => set.forEach((h) => s.on(ev, h)))
    s.on('connect', () => s.emit('join_room', { userId: usuario.id, rol: usuario.rol }))
    return () => { s.disconnect(); socketRef.current = null }
  }, [usuario?.id, usuario?.rol]) // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = useCallback((event: string, h: Handler) => {
    if (!handlers.current.has(event)) handlers.current.set(event, new Set())
    handlers.current.get(event)!.add(h)
    socketRef.current?.on(event, h)
    return () => { handlers.current.get(event)?.delete(h); socketRef.current?.off(event, h) }
  }, [])

  return <Ctx.Provider value={{ subscribe }}>{children}</Ctx.Provider>
}

/** Se suscribe a un evento mientras el componente está montado. */
export function useSocketEvent(event: string, handler: Handler) {
  const ctx = useContext(Ctx)
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => ctx?.subscribe(event, (d) => ref.current(d)), [ctx, event])
}
