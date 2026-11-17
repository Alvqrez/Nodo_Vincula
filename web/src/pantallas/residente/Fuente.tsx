import { useState, type ComponentType } from 'react'
import { Archive, Buildings, PaperPlaneTilt, PencilSimple, User, type IconProps } from '@phosphor-icons/react'
import { Button, Seal, type Tone } from '@/components/ui'
import { ErrorState, Field, MiniButton, PageHeader, Section, Skeleton, TextArea, fechaCorta } from '@/components/app'
import { api } from '@/lib/api'
import { useDialog } from '@/lib/dialog'
import { useFuente, type Fuente as FuenteT } from './reportes'
import { Dato } from './piezas'

const MAX = 300
const TIPOS: { id: FuenteT['tipo']; label: string; ayuda: string; icon: ComponentType<IconProps> }[] = [
  { id: 'propia', label: 'Propuesta propia', ayuda: 'Tú planteaste el proyecto.', icon: User },
  { id: 'banco', label: 'Banco de proyectos', ayuda: 'Lo elegiste del banco de proyectos de la institución.', icon: Archive },
  { id: 'empresa', label: 'Empresa', ayuda: 'La empresa u organización propuso el proyecto.', icon: Buildings },
]
const SELLO: Record<FuenteT['estado'], { tone: Tone; label: string }> = {
  Pendiente: { tone: 'warn', label: 'En validación' }, Validada: { tone: 'ok', label: 'Validada' }, Rechazada: { tone: 'bad', label: 'Rechazada' },
}
const PASOS = [
  ['Registras la fuente', 'Eliges el tipo y describes en pocas líneas de dónde salió el proyecto.'],
  ['Vinculación la revisa', 'Mientras esté en validación puedes editarla.'],
  ['Validada o rechazada', 'Si la rechazan verás el motivo y podrás corregirla.'],
] as const

export default function Fuente() {
  const { notify } = useDialog()
  const f = useFuente()
  const fuente = f.dato
  const [editando, setEditando] = useState(false)
  const [tipo, setTipo] = useState<FuenteT['tipo'] | ''>('')
  const [descripcion, setDescripcion] = useState('')
  const [errTipo, setErrTipo] = useState<string | null>(null)
  const [errDesc, setErrDesc] = useState<string | null>(null)
  const [errForm, setErrForm] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const puedeEditar = !!fuente && (fuente.estado === 'Pendiente' || fuente.estado === 'Rechazada')
  const formulario = editando || (f.carga === 'listo' && !fuente)

  const abrir = () => {
    setTipo(fuente?.tipo ?? ''); setDescripcion(fuente?.descripcion ?? '')
    setErrTipo(null); setErrDesc(null); setErrForm(null); setEditando(true)
  }

  const guardar = async () => {
    const t = !tipo ? 'Elige el tipo de fuente.' : null
    const d = !descripcion.trim() ? 'Describe brevemente la fuente de tu proyecto.' : null
    setErrTipo(t); setErrDesc(d); setErrForm(null)
    if (t || d) return
    setEnviando(true)
    const datos = { tipo, descripcion: descripcion.trim() }
    const res = fuente ? await api.put(`/fuentes/${fuente.id}`, datos) : await api.post('/fuentes', datos)
    setEnviando(false)
    if (res.ok) {
      setEditando(false)
      notify({ type: 'success', message: res.body?.mensaje ?? 'Fuente guardada.' })
      f.recargar()
    } else {
      // 409: ya validada o ya hay una pendiente; el backend explica cuál.
      setErrForm(res.error ?? 'No se pudo guardar. Revisa tu conexión.')
      if (res.status === 409) f.recargar()
    }
  }

  const resumen = f.carga !== 'listo' ? null
    : !fuente ? 'Aún no registras de dónde proviene tu proyecto. Vinculación la revisa y te avisa si la valida o si debes corregirla.'
    : fuente.estado === 'Pendiente' ? 'Vinculación está revisando tu fuente. Puedes editarla mientras no la revisen.'
    : fuente.estado === 'Validada' ? 'Vinculación validó la fuente de tu proyecto. Ya no se puede modificar.'
    : 'Vinculación rechazó tu fuente. Lee el motivo y envía una corrección.'

  const revisada = fuente && (fuente.revisadoPor || fuente.fechaRevision)
    ? `${fuente.estado === 'Validada' ? 'Validada' : 'Revisada'}${fuente.revisadoPor ? ` por ${fuente.revisadoPor}` : ''}${fuente.fechaRevision ? ` el ${fechaCorta(fuente.fechaRevision)}` : ''}.`
    : null

  return (
    <div className="grid gap-10">
      <PageHeader eyebrow="Validación de Vinculación" title="Fuente del proyecto"
        summary={f.carga === 'cargando' ? <Skeleton className="mt-1 h-4 w-[min(52ch,100%)]" /> : f.carga === 'error' ? 'No pudimos cargar tu fuente.' : resumen} />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section title={formulario ? (fuente ? (fuente.estado === 'Rechazada' ? 'Corregir fuente' : 'Editar fuente') : 'Registrar fuente') : 'Tu fuente'}>
          {f.carga === 'cargando' ? (
            <div role="status" aria-label="Cargando tu fuente" className="grid gap-4"><Skeleton className="h-5 w-40" /><Skeleton className="h-16" /><Skeleton className="h-4 w-56" /></div>
          ) : f.carga === 'error' ? <ErrorState message={f.error ?? 'No se pudo cargar tu fuente.'} onRetry={f.recargar} />
          : formulario ? (
            <form className="grid gap-6" noValidate onSubmit={(e) => { e.preventDefault(); guardar() }}>
              {fuente?.estado === 'Rechazada' && fuente.observaciones && (
                <figure className="grid gap-1.5 border-l-2 border-bad bg-ground py-3 pl-4 pr-3">
                  <figcaption className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-3">Motivo del rechazo</figcaption>
                  <blockquote className="text-[16.5px] leading-relaxed">{fuente.observaciones}</blockquote>
                </figure>
              )}
              <fieldset className="grid gap-2" aria-describedby={errTipo ? 'tipo-err' : undefined}>
                <legend className="mb-2 text-[15.5px] font-medium">Tipo de fuente</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TIPOS.map(({ id, label, ayuda, icon: I }) => {
                    const on = tipo === id
                    return (
                      <label key={id} className={`relative grid cursor-pointer gap-1.5 border p-4 transition-colors active:scale-[.99] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal
                        ${on ? 'border-ink bg-ground' : errTipo ? 'border-bad' : 'border-rule-strong hover:border-ink/50'}`}>
                        <input type="radio" name="tipo" value={id} checked={on} onChange={() => { setTipo(id); setErrTipo(null) }} className="sr-only" />
                        {on && <span aria-hidden="true" className="absolute left-0 top-3 h-6 w-0.5 bg-signal" />}
                        <span className="flex items-center gap-2.5">
                          <span aria-hidden="true" className={`grid size-8 place-items-center ${on ? 'bg-ink text-ground' : 'bg-tray text-ink-2'}`}><I size={16} /></span>
                          <span className="text-[16.5px] font-medium">{label}</span>
                        </span>
                        <span className="text-[14.5px] leading-snug text-ink-2">{ayuda}</span>
                      </label>
                    )
                  })}
                </div>
                {errTipo && <p id="tipo-err" role="alert" className="text-[14.5px] text-bad">{errTipo}</p>}
              </fieldset>

              <Field label="Descripción" htmlFor="fuente-desc" error={errDesc}
                help={<span className="flex justify-between gap-3"><span>De dónde salió la idea y quién la propuso.</span><span className="font-mono">{descripcion.length}/{MAX}</span></span>}>
                <TextArea id="fuente-desc" rows={4} maxLength={MAX} value={descripcion} invalid={!!errDesc}
                  aria-describedby={errDesc ? 'fuente-desc-err' : 'fuente-desc-help'}
                  placeholder="Ej.: El área de TI de la empresa propuso automatizar su inventario."
                  onChange={(e) => { setDescripcion(e.target.value.slice(0, MAX)); setErrDesc(null) }} />
              </Field>

              {errForm && <p role="alert" className="border border-bad/40 bg-bad/5 p-3 text-[15.5px] text-bad">{errForm}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="signal" icon={PaperPlaneTilt} disabled={enviando}>
                  {enviando ? 'Enviando…' : fuente ? 'Enviar corrección' : 'Enviar a validación'}
                </Button>
                {fuente && <MiniButton variant="ghost" disabled={enviando} onClick={() => { setEditando(false); setErrForm(null) }}>Cancelar</MiniButton>}
              </div>
            </form>
          ) : fuente && (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule pb-5">
                <dl className="grid gap-4">
                  <Dato label="Tipo de fuente"><span className="font-display text-[22px] font-semibold tracking-[-.02em]">{TIPOS.find((t) => t.id === fuente.tipo)?.label ?? fuente.tipo}</span></Dato>
                  <Dato label="Descripción"><span className="block max-w-[60ch] leading-relaxed text-ink-2">{fuente.descripcion}</span></Dato>
                </dl>
                <Seal key={fuente.estado} tone={SELLO[fuente.estado].tone} stamped>{SELLO[fuente.estado].label}</Seal>
              </div>
              {fuente.estado === 'Rechazada' && fuente.observaciones && (
                <figure className="grid gap-1.5 border-l-2 border-bad bg-ground py-3 pl-4 pr-3">
                  <figcaption className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-3">Motivo del rechazo</figcaption>
                  <blockquote className="text-[16.5px] leading-relaxed">{fuente.observaciones}</blockquote>
                </figure>
              )}
              <p className="text-[15.5px] text-ink-2">{fuente.estado === 'Pendiente' ? 'En espera de revisión por Vinculación. Puedes editarla mientras no la revisen.' : revisada}</p>
              {puedeEditar && (
                <div>
                  <Button variant={fuente.estado === 'Rechazada' ? 'signal' : 'ghost'} icon={PencilSimple} onClick={abrir}>
                    {fuente.estado === 'Rechazada' ? 'Corregir fuente' : 'Editar fuente'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Section>

        <Section title="Cómo funciona">
          <ol className="grid">
            {PASOS.map(([t, d], i) => {
              const actual = f.carga === 'listo' && (fuente ? (fuente.estado === 'Pendiente' ? 1 : 2) : 0) === i
              return (
                <li key={t} className="grid grid-cols-[2rem_1fr] gap-x-3 border-b border-rule py-3.5 last:border-b-0">
                  <span className={`font-mono text-[13.5px] ${actual ? 'text-signal-ink' : 'text-ink-3'}`}>{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className={`block text-[16px] ${actual ? 'font-semibold' : 'font-medium'}`}>{t}{actual && <span className="sr-only"> (paso actual)</span>}</span>
                    <span className="block text-[14.5px] leading-relaxed text-ink-2">{d}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </Section>
      </div>
    </div>
  )
}
