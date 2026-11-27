/** Concentra las peticiones autenticadas y las operaciones de archivos del cliente web. */

/**
 * Cliente del backend de NODO Vincula (Express). Mismos endpoints y contratos que la app Expo.
 * Base: VITE_API_URL (raíz del servidor, sin /api). Por defecto, el backend local.
 */
export const API_ROOT = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001').replace(/\/+$/, '').replace(/\/api$/, '')

const TOKEN_KEY = 'authToken'
let token: string | null = (() => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } })()

export const getToken = () => token
export function setToken(t: string | null) {
  token = t
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) } catch { /* sin almacenamiento */ }
}

export type ApiResult<T = Record<string, unknown>> = { ok: boolean; status: number; body: (T & { ok?: boolean; mensaje?: string }) | null; error?: string }

// Aquí se agregan las cabeceras y se convierte la respuesta de Express en un resultado para la interfaz.
async function request<T>(method: string, path: string, data?: unknown): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {}
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    const res = await fetch(`${API_ROOT}${path.startsWith('/api') ? path : `/api${path}`}`, {
      method, headers, body: data === undefined ? undefined : JSON.stringify(data),
    })
    const text = await res.text()
    let body: ApiResult<T>['body'] = null
    try { body = text ? JSON.parse(text) : null } catch { body = null }
    // Sesión vencida mientras se usa la app: se avisa una vez para volver al acceso.
    if (res.status === 401 && token && !path.includes('/auth/')) window.dispatchEvent(new Event('vincula:sesion-vencida'))
    const ok = res.ok && body?.ok !== false
    const bodyError = (body as { error?: { message?: string } } | null)?.error?.message
    return { ok, status: res.status, body, error: ok ? undefined : body?.mensaje ?? bodyError ?? 'No pudimos completar la acción.' }
  } catch {
    return { ok: false, status: 0, body: null, error: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.' }
  }
}

export const api = {
  get: <T = Record<string, unknown>>(p: string) => request<T>('GET', p),
  post: <T = Record<string, unknown>>(p: string, d?: unknown) => request<T>('POST', p, d ?? {}),
  put: <T = Record<string, unknown>>(p: string, d?: unknown) => request<T>('PUT', p, d ?? {}),
  patch: <T = Record<string, unknown>>(p: string, d?: unknown) => request<T>('PATCH', p, d ?? {}),
  delete: <T = Record<string, unknown>>(p: string, d?: unknown) => request<T>('DELETE', p, d),
}

/** Lee un archivo como data URL (base64), como lo espera el backend para reportes, fotos y recursos. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('No pudimos leer el archivo.'))
    r.readAsDataURL(file)
  })
}

/** Abre un archivo protegido del backend (requiere el token): PDF en pestaña nueva, otros se descargan. */
export async function abrirArchivo(ruta: string, nombre = 'archivo') {
  const origenApi = new URL(API_ROOT || '/', window.location.origin).origin
  const url = new URL(ruta.startsWith('http') ? ruta : `${API_ROOT}${ruta.startsWith('/') ? ruta : `/${ruta}`}`, window.location.origin)
  // La pestaña se abre antes del fetch para que el navegador no la bloquee.
  const win = window.open('', '_blank')
  if (win) win.opener = null
  try {
    // El token se agrega únicamente cuando el archivo se pide al origen configurado de la API.
    const res = await fetch(url, { headers: token && url.origin === origenApi ? { Authorization: `Bearer ${token}` } : {} })
    if (res.status === 401) throw new Error('Vuelve a iniciar sesión para abrir el archivo.')
    if (res.status === 403 || res.status === 404) throw new Error('Este archivo no está disponible para tu cuenta.')
    if (!res.ok) throw new Error('Intenta abrir el archivo de nuevo en unos minutos.')
    const blob = await res.blob()
    const obj = URL.createObjectURL(blob)
    if (blob.type === 'application/pdf' && win) { win.location.href = obj; return }
    win?.close()
    const a = document.createElement('a'); a.href = obj; a.download = nombre; a.click()
    setTimeout(() => URL.revokeObjectURL(obj), 60_000)
  } catch (e) {
    win?.close()
    throw e
  }
}
