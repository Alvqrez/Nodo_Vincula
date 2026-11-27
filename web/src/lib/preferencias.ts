/** Almacena y comparte la preferencia de navegación de la interfaz web. */

import { useSyncExternalStore } from 'react'

/** Dónde vive la navegación en escritorio. Se recuerda por navegador; en celular siempre es la barra inferior. */
export type ModoNav = 'superior' | 'lateral'
const KEY = 'nodo-vincula.nav'
const EVENTO = 'nodo-vincula:nav'

function leer(): ModoNav {
  try { return localStorage.getItem(KEY) === 'lateral' ? 'lateral' : 'superior' } catch { return 'superior' }
}

export function setModoNav(m: ModoNav) {
  try { localStorage.setItem(KEY, m) } catch { /* sin almacenamiento: dura la sesión */ }
  window.dispatchEvent(new Event(EVENTO))
}

export function useModoNav(): ModoNav {
  return useSyncExternalStore(
    (cb) => { window.addEventListener(EVENTO, cb); window.addEventListener('storage', cb); return () => { window.removeEventListener(EVENTO, cb); window.removeEventListener('storage', cb) } },
    leer,
    () => 'superior',
  )
}
