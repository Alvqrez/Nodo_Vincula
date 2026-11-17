import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Eye, EyeSlash, GithubLogo, WarningCircle } from '@phosphor-icons/react'
import { Lockup, NodoMark } from '@/components/brand'
import { Button, CopyButton, ThemeToggle } from '@/components/ui'
import { Field, Sheet, TextInput } from '@/components/app'
import { SITE } from '@/content'
import { ROL_LABEL, olvidarUltimoUsuario, ultimoUsuario, useSession } from '@/lib/session'

export default function Acceso() {
  const { estado, entrar, avisoAcceso, limpiarAviso } = useSession()
  const location = useLocation()
  const [correo, setCorreo] = useState('')
  const [pass, setPass] = useState('')
  const [ver, setVer] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState<{ correo?: string; pass?: string; general?: string }>({})
  const [ayuda, setAyuda] = useState(false)
  const [ultimo, setUltimo] = useState(ultimoUsuario)

  if (estado === 'dentro') {
    const desde = (location.state as { desde?: string } | null)?.desde
    return <Navigate to={desde?.startsWith('/app') ? desde : '/app'} replace />
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (enviando) return
    const err: typeof errores = {}
    if (!correo.trim()) err.correo = 'Escribe tu correo institucional.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) err.correo = 'Revisa el formato del correo (nombre@dominio).'
    if (!pass) err.pass = 'Escribe tu contraseña.'
    setErrores(err)
    if (Object.keys(err).length) return
    setEnviando(true)
    limpiarAviso()
    const r = await entrar(correo.trim(), pass)
    setEnviando(false)
    if (!r.ok) setErrores({ general: r.mensaje ?? 'No pudimos entrar. Intenta de nuevo.' })
  }

  const general = errores.general ?? avisoAcceso

  return (
    <div className="page-in grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
      <main className="flex flex-col px-4 py-6 sm:px-10 lg:px-20">
        <div className="flex items-center justify-between"><a href="/" aria-label="Volver al inicio de NODO Vincula"><Lockup size="sm" /></a><ThemeToggle /></div>
        <div className="flex flex-1 items-center py-12">
          <div className="w-full max-w-[420px]">
            <p className="font-mono text-[12.5px] uppercase tracking-[.1em] text-ink-3">{SITE.institution}</p>
            {ultimo ? (
              <>
                <h1 className="mt-4 font-display text-[clamp(2.2rem,4vw,3.1rem)] font-semibold leading-[1] tracking-[-.04em]">Hola de nuevo, {ultimo.nombre.split(' ')[0]}.</h1>
                <p className="mt-3 text-ink-2">
                  Entraste antes como {ROL_LABEL[ultimo.rol].toLowerCase()}.{' '}
                  <button type="button" onClick={() => { olvidarUltimoUsuario(); setUltimo(null) }} className="text-ink underline underline-offset-4 hover:text-signal-ink">¿No eres tú?</button>
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-4 font-display text-[clamp(2.2rem,4vw,3.1rem)] font-semibold leading-[1] tracking-[-.04em]">Abre tu expediente.</h1>
                <p className="mt-3 text-ink-2">Entra con la cuenta que te dio la Jefatura de Vinculación.</p>
              </>
            )}

            {general && (
              <p role="alert" className="mt-6 flex gap-2.5 border border-bad/40 bg-bad/5 p-3.5 text-[15.5px] text-ink">
                <WarningCircle size={18} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" />{general}
              </p>
            )}

            <div className="mt-8 grid gap-3">
              <a href={`${SITE.nodoUrl}/app/vincula`}
                className="flex min-h-12 items-center justify-between gap-3 border border-rule-strong bg-sheet px-4 text-[16.5px] font-medium text-ink transition-colors hover:border-ink active:scale-[.99]">
                <span className="flex items-center gap-3"><NodoMark size={22} />Continuar con tu cuenta de NODO</span>
                <span className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-3">Residentes</span>
              </a>
              <div className="my-2 flex items-center gap-3 text-[13.5px] text-ink-3"><span className="h-px flex-1 bg-rule" />o con tu correo<span className="h-px flex-1 bg-rule" /></div>
            </div>

            <form className="grid gap-5" noValidate onSubmit={enviar}>
              <Field label="Correo institucional" htmlFor="correo" error={errores.correo}>
                <TextInput id="correo" type="email" autoComplete="username" inputMode="email" value={correo} invalid={!!errores.correo}
                  aria-describedby={errores.correo ? 'correo-err' : undefined}
                  onChange={(e) => { setCorreo(e.target.value); setErrores((x) => ({ ...x, correo: undefined, general: undefined })) }} />
              </Field>
              <Field label="Contraseña" htmlFor="pass" error={errores.pass}>
                <div className={`flex min-h-11 items-center border bg-sheet transition-colors focus-within:border-ink ${errores.pass ? 'border-bad' : 'border-rule-strong'}`}>
                  <input id="pass" type={ver ? 'text' : 'password'} autoComplete="current-password" value={pass} aria-invalid={!!errores.pass || undefined}
                    aria-describedby={errores.pass ? 'pass-err' : undefined}
                    onChange={(e) => { setPass(e.target.value); setErrores((x) => ({ ...x, pass: undefined, general: undefined })) }}
                    className="min-w-0 flex-1 bg-transparent px-3.5 text-[16.5px] text-ink outline-none" />
                  <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={ver}
                    className="grid size-11 place-items-center text-ink-2 hover:text-ink">{ver ? <EyeSlash size={18} /> : <Eye size={18} />}</button>
                </div>
              </Field>
              <Button type="submit" variant="ink" disabled={enviando} className="w-full justify-between">{enviando ? 'Entrando…' : 'Entrar'}</Button>
            </form>

            <button type="button" onClick={() => setAyuda(true)} className="mt-6 min-h-11 text-[15.5px] text-ink-2 underline-offset-4 hover:text-ink hover:underline">¿Problemas para entrar?</button>
          </div>
        </div>
      </main>

      <aside className="chapter relative hidden overflow-hidden border-l border-rule lg:block" aria-label="Sobre NODO Vincula">
        <svg aria-hidden="true" viewBox="0 0 32 32" className="absolute -right-[38%] -top-[16%] w-[105%]">
          <circle cx="16" cy="16" r="10" fill="none" stroke="#FF5A1F" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="46 17" transform="rotate(-50 16 16)" className="draw" style={{ ['--len' as string]: 63 }} />
          <circle cx="16" cy="16" r="2.4" fill="#F3EFE6" />
        </svg>
        <div className="relative grid h-full content-end p-14">
          <p className="max-w-[24ch] font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-.035em]">
            Preliminar, tres parciales y final. <span className="text-ink-2">Todo en un expediente.</span>
          </p>
        </div>
      </aside>

      <Sheet open={ayuda} onClose={() => setAyuda(false)} title="Soporte de NODO Vincula">
        <p className="text-ink-2">Si aún no tienes cuenta, la crea la Jefatura de Vinculación. Para cualquier otro problema, escríbenos.</p>
        <div className="mt-5 grid gap-3 border-t border-rule pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="select-all">{SITE.support.email}</span>
            <CopyButton text={SITE.support.email} label="correo de soporte" />
          </div>
          <a href={SITE.support.github} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-ink-2 hover:text-ink">
            <GithubLogo size={18} aria-hidden="true" />{SITE.support.githubLabel}
          </a>
        </div>
      </Sheet>
    </div>
  )
}
