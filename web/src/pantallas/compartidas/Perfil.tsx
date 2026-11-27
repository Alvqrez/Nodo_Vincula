/** Presenta el perfil, procesa la foto y ofrece las secciones disponibles para cada rol. */

/**
 * Perfil (antes "Utilerías"). Mismo comportamiento que src/screens/Utilerias.js: foto de perfil
 * (comprimida en el navegador para el límite de 2 MB del backend), apariencia, biblioteca real de
 * recursos (/api/recursos; la Jefatura publica y elimina), contactos, notas del rol e información del sistema.
 */
import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowSquareOut, Camera, DownloadSimple, FileArrowUp, FolderOpen, GithubLogo, Trash, UploadSimple, X } from '@phosphor-icons/react'
import { EmptyState, ErrorState, Field, PageHeader, Section, Segmented, Skeleton, TextArea, TextInput, fechaCorta } from '@/components/app'
import { setModoNav, useModoNav } from '@/lib/preferencias'
import { Bezel, Button, Seal, ThemeSegmented } from '@/components/ui'
import { SITE } from '@/content'
import { abrirArchivo, api, fileToDataUrl } from '@/lib/api'
import { useDialog } from '@/lib/dialog'
import { setFotoCache, useFoto } from '@/lib/fotos'
import { ROL_LABEL, iniciales, nombreCompleto, useUsuario, type Rol } from '@/lib/session'
import { Accion, ChipRadio, Copiar, Datos, IconButton } from './piezas'

type Recurso = {
  id: string; titulo: string; descripcion: string; rolDestino: Destino; nombreArchivo: string; tipo: string
  mime: string; tamano: number; subidoPor: string | null; createdAt: string
}
type Destino = 'todos' | 'residente' | 'asesor' | 'jefe'
const DESTINOS: { id: Destino; label: string }[] = [
  { id: 'todos', label: 'Todos' }, { id: 'residente', label: 'Residentes' }, { id: 'asesor', label: 'Asesores' }, { id: 'jefe', label: 'Vinculación' },
]
const destinoLabel = (id: string) => DESTINOS.find((d) => d.id === id)?.label ?? id
const MAX_RECURSO = 10 * 1024 * 1024
const MAX_FOTO_B64 = 2_000_000 // límite de POST /api/fotos (longitud del texto base64)

const tamano = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`)

/** Notas por rol: reglas que hoy aplica el sistema (sin fechas fijas: las define Vinculación por período). */
const NOTAS: Record<Rol, string[]> = {
  residente: [
    'Tus fechas límite las define Vinculación para tu período. Las ves en tu inicio y en cada reporte.',
    'Los reportes parciales se abren en orden, conforme tu asesor acepta el anterior.',
    'Entregas en PDF o DOCX de hasta 10 MB.',
  ],
  asesor: [
    'Retroalimenta los reportes en máximo 7 días.',
    'Puedes desbloquear el siguiente reporte de un residente cuando haga falta.',
  ],
  jefe: [
    'Valida los convenios antes del inicio del semestre.',
    'Cada documento que publiques lo ve el rol que elijas; “Todos” lo comparte con residentes y asesores.',
  ],
}

/** Reduce la foto a 400 px por lado y la pasa a JPEG; baja la calidad hasta que quepa en 2 MB. */
function comprimirFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      // La escala mantiene la proporción y limita el lado mayor a 400 píxeles.
      const s = Math.min(1, 400 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
      const ctx = c.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Tu navegador no pudo procesar la imagen.')); return }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height) // PNG con transparencia → fondo blanco
      ctx.drawImage(img, 0, 0, c.width, c.height)
      // Reducir la calidad por pasos intenta que el JPEG codificado quepa en el límite del campo.
      let q = 0.82
      let out = c.toDataURL('image/jpeg', q)
      while (out.length > MAX_FOTO_B64 && q > 0.35) { q -= 0.12; out = c.toDataURL('image/jpeg', q) }
      URL.revokeObjectURL(url)
      if (out.length > MAX_FOTO_B64) reject(new Error('La imagen sigue pesando más de 2 MB. Prueba con otra.'))
      else resolve(out)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No pudimos leer la imagen. Usa JPG, PNG o WEBP.')) }
    img.src = url
  })
}

export default function Perfil() {
  const u = useUsuario()
  const esJefe = u.rol === 'jefe'
  const modoNav = useModoNav()
  return (
    <div className="grid gap-10">
      <PageHeader eyebrow={ROL_LABEL[u.rol]} title="Perfil"
        summary={esJefe ? 'Tu cuenta, tu foto, la apariencia y los documentos que publicas para cada rol.' : 'Tu cuenta, tu foto, la apariencia y los documentos que publica Vinculación.'} />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-12">
          <Ficha />
          <Recursos />
        </div>
        <div className="grid min-w-0 content-start gap-12">
          <Section title="Apariencia">
            <div className="grid gap-3">
              <ThemeSegmented className="w-fit [&_button]:min-h-11" />
              <p className="text-[14.5px] text-ink-3">“Sistema” sigue la configuración de tu dispositivo. Tu elección se guarda en este navegador.</p>
            </div>
          </Section>
          <Section title="Preferencias">
            <div className="grid gap-3">
              <p className="text-[15.5px] font-medium">Navegación en computadora</p>
              <Segmented label="Navegación en computadora" value={modoNav} onChange={setModoNav}
                options={[{ id: 'superior', label: 'Menú superior' }, { id: 'lateral', label: 'Menú lateral' }]} />
              <p className="text-[14.5px] text-ink-3">
                {modoNav === 'superior'
                  ? 'Las secciones van en la barra de arriba como íconos; al pasar el cursor muestran su nombre.'
                  : 'Las secciones van en una barra a la izquierda, con su nombre siempre visible.'}{' '}
                En el celular siempre usas la barra inferior. Se guarda en este navegador.
              </p>
            </div>
          </Section>
          <Contactos />
          <Section title={`Notas para ${u.rol === 'jefe' ? 'Vinculación' : ROL_LABEL[u.rol].toLowerCase()}`}>
            <ol className="grid gap-3">
              {NOTAS[u.rol].map((n, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr] text-[16px] leading-relaxed text-ink-2">
                  <span className="pt-0.5 font-mono text-[13.5px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>{n}
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Sistema">
            <Datos items={[
              { k: 'Versión', v: <span className="font-mono text-[15.5px]">NODO Vincula 2.0</span> },
              { k: 'Institución', v: SITE.institution },
              { k: 'Soporte', v: <a href={`mailto:${SITE.support.email}`} className="underline underline-offset-4 hover:text-signal-ink">{SITE.support.email}</a> },
            ]} />
          </Section>
        </div>
      </div>
    </div>
  )
}

/* ── Ficha de la cuenta: la portada del expediente ── */
function Ficha() {
  const u = useUsuario()
  const foto = useFoto(u.id)
  const { confirm, notify } = useDialog()
  const input = useRef<HTMLInputElement>(null)
  const [ocupado, setOcupado] = useState<'subiendo' | 'quitando' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nombre = nombreCompleto(u)

  const elegir = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) { setError('Elige una imagen: JPG, PNG o WEBP.'); return }
    setOcupado('subiendo')
    try {
      const datos = await comprimirFoto(file)
      const r = await api.post('/fotos', { foto_base64: datos })
      if (!r.ok) throw new Error(r.error ?? 'No pudimos guardar la foto.')
      setFotoCache(u.id, datos)
      notify({ type: 'success', message: 'Tu foto quedó guardada.' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar la foto.')
    } finally {
      setOcupado(null)
      if (input.current) input.current.value = ''
    }
  }

  const quitar = async () => {
    const ok = await confirm({ title: 'Quitar foto', message: 'Tu foto de perfil se eliminará. En su lugar se mostrarán tus iniciales.', confirmLabel: 'Quitar foto', destructive: true })
    if (!ok) return
    setOcupado('quitando'); setError(null)
    const r = await api.delete('/fotos')
    setOcupado(null)
    if (r.ok) { setFotoCache(u.id, null); notify({ type: 'success', message: 'Quitamos tu foto de perfil.' }) }
    else setError(r.error ?? 'No pudimos quitar la foto.')
  }

  return (
    <section aria-labelledby="ficha-t">
      <Bezel innerClassName="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-7">
        <div className="grid content-start justify-items-start gap-3">
          <div className="tick relative size-28 border border-rule bg-tray">
            {foto ? <img src={foto} alt={`Foto de ${nombre}`} className="size-full object-cover" />
              : <span aria-hidden="true" className="grid size-full place-items-center bg-ink font-display text-[2rem] font-semibold tracking-[-.02em] text-ground">{iniciales(nombre)}</span>}
            {ocupado && <span className="skeleton absolute inset-0" aria-hidden="true" />}
          </div>
          <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void elegir(e.target.files?.[0])} />
          <div className="flex flex-wrap gap-1.5">
            <Accion icon={Camera} disabled={!!ocupado} onClick={() => input.current?.click()}>
              {ocupado === 'subiendo' ? 'Guardando…' : foto ? 'Cambiar foto' : 'Subir foto'}
            </Accion>
            {foto && <IconButton icon={Trash} tone="danger" label="Quitar foto de perfil" disabled={!!ocupado} onClick={() => void quitar()} className="border border-rule-strong" />}
          </div>
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <div className="grid gap-2">
            <Seal tone="neutral" className="w-fit">{ROL_LABEL[u.rol]}</Seal>
            <h2 id="ficha-t" className="font-display text-[1.75rem] font-semibold leading-[1.05] tracking-[-.035em]">{nombre}</h2>
          </div>
          <Datos items={[
            { k: 'Correo', v: <span className="font-mono text-[15.5px]">{u.correo}</span> },
            { k: 'Rol', v: ROL_LABEL[u.rol] },
          ]} />
          {error ? <p role="alert" className="text-[14.5px] text-bad">{error}</p>
            : <p className="text-[14px] text-ink-3">Foto: JPG, PNG o WEBP. La reducimos a 400 px antes de guardarla.</p>}
        </div>
      </Bezel>
    </section>
  )
}

/* ── Biblioteca de recursos; la Jefatura además publica y elimina ── */
function Recursos() {
  const u = useUsuario()
  const esJefe = u.rol === 'jefe'
  const { confirm, notify } = useDialog()
  const reduce = useReducedMotion()
  const [lista, setLista] = useState<Recurso[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [abriendo, setAbriendo] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setError(null)
    const r = await api.get<{ recursos: Recurso[] }>('/recursos')
    if (r.ok) setLista(r.body?.recursos ?? [])
    else { setError(r.error ?? 'No se pudieron cargar los documentos.'); setLista((l) => l ?? []) }
  }, [])
  useEffect(() => { void cargar() }, [cargar])

  const abrir = async (r: Recurso) => {
    setAbriendo(r.id)
    try { await abrirArchivo(`/api/recursos/${r.id}/archivo`, r.nombreArchivo || 'documento') }
    catch (e) { notify({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo abrir el documento.' }) }
    finally { setAbriendo(null) }
  }

  const eliminar = async (r: Recurso) => {
    const ok = await confirm({
      title: 'Eliminar documento',
      message: `“${r.titulo}” dejará de estar disponible para ${destinoLabel(r.rolDestino).toLowerCase()}.`,
      confirmLabel: 'Eliminar', destructive: true,
    })
    if (!ok) return
    setEliminando(r.id)
    const res = await api.delete(`/recursos/${r.id}`)
    setEliminando(null)
    if (res.ok) { notify({ type: 'success', message: 'Documento eliminado.' }); await cargar() }
    else notify({ type: 'error', message: res.error ?? 'No se pudo eliminar el documento.' })
  }

  const cargando = lista === null
  return (
    <div className="grid gap-12">
      {esJefe && <Publicar onPublicado={cargar} />}
      <Section title={esJefe ? 'Documentos publicados' : 'Recursos y documentos'}
        aside={lista && lista.length > 0 ? <span className="font-mono text-[12.5px] text-ink-3">{lista.length}</span> : undefined}>
        {!esJefe && <p className="-mt-1 text-[15.5px] text-ink-2">Guías y formatos oficiales que publica Vinculación.</p>}
        {error && <ErrorState message={error} onRetry={() => void cargar()} />}
        {cargando ? (
          <div role="status" aria-label="Cargando documentos" className="grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-4 border-b border-rule py-4">
                <Skeleton className="size-11" /><div className="grid gap-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></div><Skeleton className="h-11 w-24" />
              </div>
            ))}
          </div>
        ) : !error && lista.length === 0 ? (
          <EmptyState icon={FolderOpen} title={esJefe ? 'Aún no publicas documentos.' : 'Todavía no hay documentos para ti.'}>
            {esJefe ? 'Los que publiques aparecerán aquí y en el perfil de cada rol al que vayan dirigidos.' : 'Aparecerán aquí cuando Vinculación publique guías o formatos para tu rol.'}
          </EmptyState>
        ) : lista.length > 0 && (
          <ul className="-mt-2 divide-y divide-rule">
            <AnimatePresence initial={false}>
              {lista.map((r) => {
                const pdf = r.tipo === 'PDF'
                return (
                  <motion.li key={r.id} layout={reduce ? false : 'position'} initial={reduce ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
                    className="grid grid-cols-[2.75rem_1fr] gap-x-4 gap-y-3 py-4 sm:grid-cols-[2.75rem_1fr_auto] sm:items-center">
                    <span aria-hidden="true" className="grid size-11 place-items-center border border-rule-strong font-mono text-[12px] font-semibold tracking-[.06em] text-ink-2">{r.tipo || 'DOC'}</span>
                    <div className="min-w-0">
                      <p className="text-[16.5px] font-medium leading-snug">{r.titulo}</p>
                      {r.descripcion && <p className="mt-0.5 text-[15px] leading-relaxed text-ink-2">{r.descripcion}</p>}
                      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[13px] text-ink-3">
                        <span>{tamano(r.tamano)}</span>
                        {r.createdAt && <span>{fechaCorta(r.createdAt)}</span>}
                        {esJefe && <span>Para: {destinoLabel(r.rolDestino)}</span>}
                        {esJefe && r.subidoPor && <span className="font-sans">{r.subidoPor}</span>}
                      </p>
                    </div>
                    <div className="col-start-2 flex gap-1.5 sm:col-start-3">
                      <Accion icon={pdf ? ArrowSquareOut : DownloadSimple} disabled={abriendo === r.id} onClick={() => void abrir(r)}
                        label={`${pdf ? 'Abrir' : 'Descargar'} ${r.titulo}`}>
                        {abriendo === r.id ? 'Abriendo…' : pdf ? 'Abrir' : 'Descargar'}
                      </Accion>
                      {esJefe && <IconButton icon={Trash} tone="danger" label={`Eliminar ${r.titulo}`} disabled={eliminando === r.id} onClick={() => void eliminar(r)} className="border border-rule-strong" />}
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </Section>
    </div>
  )
}

/* ── Formulario de publicación (solo Jefatura): mismo cuerpo que la app anterior ── */
function Publicar({ onPublicado }: { onPublicado: () => Promise<void> }) {
  const { notify } = useDialog()
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [destino, setDestino] = useState<Destino>('todos')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [err, setErr] = useState<{ titulo?: string; archivo?: string; general?: string }>({})
  const [publicando, setPublicando] = useState(false)
  const [sobre, setSobre] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const tomar = (f: File | undefined) => {
    if (!f) return
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    if (!['.pdf', '.docx'].includes(ext)) { setErr((e) => ({ ...e, archivo: 'Solo se aceptan archivos PDF o DOCX.' })); return }
    if (f.size > MAX_RECURSO) { setErr((e) => ({ ...e, archivo: 'El archivo supera el máximo de 10 MB.' })); return }
    setArchivo(f); setErr((e) => ({ ...e, archivo: undefined, general: undefined }))
  }
  const soltar = (e: DragEvent) => { e.preventDefault(); setSobre(false); tomar(e.dataTransfer.files?.[0]) }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (publicando) return
    const n: typeof err = {}
    if (!titulo.trim()) n.titulo = 'Escribe el título del documento.'
    if (!archivo) n.archivo = 'Selecciona el archivo PDF o DOCX.'
    setErr(n)
    if (n.titulo) { document.getElementById('rec-titulo')?.focus(); return }
    if (n.archivo || !archivo) return
    setPublicando(true)
    try {
      const datos = await fileToDataUrl(archivo)
      const r = await api.post('/recursos', { titulo: titulo.trim(), descripcion: descripcion.trim(), rol_destino: destino, archivo: datos, nombre_archivo: archivo.name })
      if (!r.ok) { setErr({ general: r.error ?? 'No se pudo publicar el documento.' }); return }
      setTitulo(''); setDescripcion(''); setDestino('todos'); setArchivo(null)
      if (input.current) input.current.value = ''
      notify({ type: 'success', message: 'Documento publicado.' })
      await onPublicado()
    } catch (x) {
      setErr({ general: x instanceof Error ? x.message : 'No se pudo publicar el documento.' })
    } finally { setPublicando(false) }
  }

  return (
    <Section title="Gestionar recursos">
      <p className="-mt-1 text-[15.5px] text-ink-2">Publica guías y formatos oficiales en PDF o DOCX y elige quién los ve.</p>
      <form noValidate onSubmit={enviar} className="grid gap-5">
        <Field htmlFor="rec-titulo" label="Título" error={err.titulo} help={`${titulo.length}/150`}>
          <TextInput id="rec-titulo" value={titulo} maxLength={150} invalid={!!err.titulo} placeholder="Ej.: Formato de reporte preliminar"
            aria-describedby={err.titulo ? 'rec-titulo-err' : 'rec-titulo-help'}
            onChange={(e) => { setTitulo(e.target.value); if (err.titulo) setErr((x) => ({ ...x, titulo: undefined })) }} />
        </Field>
        <Field htmlFor="rec-desc" label="Descripción (opcional)" help={`${descripcion.length}/500`}>
          <TextArea id="rec-desc" rows={2} value={descripcion} maxLength={500} placeholder="Para qué sirve y cuándo usarlo"
            aria-describedby="rec-desc-help" onChange={(e) => setDescripcion(e.target.value)} />
        </Field>
        <div className="grid gap-2">
          <p className="text-[15.5px] font-medium">Para quién</p>
          <ChipRadio label="Para quién es el documento" value={destino} onChange={setDestino} options={DESTINOS} />
        </div>
        <div className="grid gap-2">
          <p className="text-[15.5px] font-medium" id="rec-archivo-l">Archivo</p>
          <input ref={input} id="rec-archivo" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only" aria-labelledby="rec-archivo-l" aria-describedby={err.archivo ? 'rec-archivo-err' : 'rec-archivo-help'}
            onChange={(e) => tomar(e.target.files?.[0])} />
          {archivo ? (
            <div className="flex items-center gap-3 border border-rule-strong bg-sheet py-1 pl-3 pr-1">
              <FileArrowUp size={20} className="shrink-0 text-ink-2" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-medium">{archivo.name}</span>
                <span className="block font-mono text-[13px] text-ink-3">{tamano(archivo.size)}</span>
              </span>
              <IconButton icon={X} label="Quitar archivo" onClick={() => { setArchivo(null); if (input.current) input.current.value = '' }} />
            </div>
          ) : (
            <label htmlFor="rec-archivo" onDragOver={(e) => { e.preventDefault(); setSobre(true) }} onDragLeave={() => setSobre(false)} onDrop={soltar}
              className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed px-4 py-5 text-center transition-colors
                ${err.archivo ? 'border-bad' : sobre ? 'border-ink bg-ink/[.04]' : 'border-rule-strong hover:border-ink'}`}>
              <UploadSimple size={22} className="text-ink-2" aria-hidden="true" />
              <span className="text-[16px] font-medium">Elegir archivo<span className="hidden font-normal text-ink-2 sm:inline"> o arrastrarlo aquí</span></span>
            </label>
          )}
          {err.archivo ? <p id="rec-archivo-err" role="alert" className="text-[14.5px] text-bad">{err.archivo}</p>
            : <p id="rec-archivo-help" className="text-[14px] text-ink-3">PDF o DOCX, máximo 10 MB.</p>}
        </div>
        {err.general && <ErrorState message={err.general} />}
        <div>
          <Button type="submit" variant="signal" icon={UploadSimple} disabled={publicando}>{publicando ? 'Publicando…' : 'Publicar documento'}</Button>
        </div>
      </form>
    </Section>
  )
}

/* ── Contactos reales de la sesión + soporte ── */
function Contactos() {
  const u = useUsuario()
  const filas: { rol: string; nombre: string; detalle?: string; correo: string }[] = []
  if (u.asesorInfo) filas.push({ rol: 'Tu asesor', nombre: u.asesorInfo.nombre, detalle: u.asesorInfo.departamento || undefined, correo: u.asesorInfo.correo })
  if (u.jefeInfo && u.rol !== 'jefe') filas.push({ rol: 'Jefatura de Vinculación', nombre: u.jefeInfo.nombre, correo: u.jefeInfo.correo })
  return (
    <Section title="Contactos">
      <ul className="-mt-2 divide-y divide-rule">
        {u.rol === 'residente' && !u.asesorInfo && (
          <li className="py-4 text-[15.5px] text-ink-2">Aún no tienes asesor asignado. La Jefatura de Vinculación te lo asigna.</li>
        )}
        {filas.map((c) => (
          <li key={c.rol} className="grid gap-1 py-4">
            <p className="font-mono text-[12.5px] uppercase tracking-[.1em] text-ink-3">{c.rol}</p>
            <p className="text-[16.5px] font-medium">{c.nombre}</p>
            {c.detalle && <p className="text-[14.5px] text-ink-2">{c.detalle}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <a href={`mailto:${c.correo}`} className="min-w-0 break-all font-mono text-[14.5px] text-ink underline underline-offset-4 hover:text-signal-ink">{c.correo}</a>
              <Copiar text={c.correo} label={`correo de ${c.nombre}`} />
            </div>
          </li>
        ))}
        <li className="grid gap-1 py-4">
          <p className="font-mono text-[12.5px] uppercase tracking-[.1em] text-ink-3">Soporte técnico</p>
          <p className="text-[16.5px] font-medium">Soporte de NODO Vincula</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <a href={`mailto:${SITE.support.email}`} className="break-all font-mono text-[14.5px] text-ink underline underline-offset-4 hover:text-signal-ink">{SITE.support.email}</a>
            <Copiar text={SITE.support.email} label="correo de soporte" />
          </div>
          <a href={SITE.support.github} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 w-fit items-center gap-2 text-[14.5px] text-ink-2 hover:text-ink">
            <GithubLogo size={16} aria-hidden="true" />{SITE.support.githubLabel}
          </a>
        </li>
      </ul>
    </Section>
  )
}
