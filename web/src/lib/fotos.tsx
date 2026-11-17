import { useEffect, useState } from 'react'
import { api } from './api'

/** Fotos de perfil (GET /api/fotos/:userId, base64). Caché en memoria por sesión. */
const cache = new Map<string, string | null>()
const listeners = new Set<() => void>()

export function useFoto(userId: string | undefined): string | null {
  const [, force] = useState(0)
  useEffect(() => {
    const on = () => force((n) => n + 1)
    listeners.add(on)
    if (userId && !cache.has(userId)) {
      cache.set(userId, null)
      void api.get<{ foto: string | null }>(`/fotos/${userId}`).then((r) => { cache.set(userId, r.body?.foto ?? null); listeners.forEach((l) => l()) })
    }
    return () => { listeners.delete(on) }
  }, [userId])
  return userId ? cache.get(userId) ?? null : null
}

/** Actualiza la caché tras subir o borrar la propia foto. */
export function setFotoCache(userId: string, foto: string | null) {
  cache.set(userId, foto)
  listeners.forEach((l) => l())
}
