/** Ofrece avisos y confirmaciones compartidos mediante un proveedor de React. */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Info, Warning, WarningCircle, X } from '@phosphor-icons/react'

/**
 * Confirmaciones y avisos propios (mismo contrato que useDialog de la app Expo):
 * confirm() → Promise<boolean>, alert() → Promise<void>, notify() → aviso breve apilado.
 */
type Tipo = 'info' | 'success' | 'error' | 'warning'
type ConfirmOpts = { title: string; message?: ReactNode; confirmLabel?: string; cancelLabel?: string; destructive?: boolean }
type NotifyOpts = { type?: Tipo; title?: string; message: string; duration?: number }
type Modal = ConfirmOpts & { kind: 'confirm' | 'alert'; resolve: (v: boolean) => void }

const Ctx = createContext<{
  confirm: (o: ConfirmOpts) => Promise<boolean>
  alert: (o: { title: string; message?: ReactNode; okLabel?: string }) => Promise<void>
  notify: (o: NotifyOpts) => void
} | null>(null)

const ICON = { info: Info, success: CheckCircle, error: WarningCircle, warning: Warning }
const TONE = { info: 'text-ink-2', success: 'text-ok', error: 'text-bad', warning: 'text-warn' }

export function DialogProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<Modal | null>(null)
  const [toasts, setToasts] = useState<(NotifyOpts & { id: number })[]>([])
  const okRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setModal({ ...o, kind: 'confirm', resolve })), [])
  const alert = useCallback((o: { title: string; message?: ReactNode; okLabel?: string }) =>
    new Promise<void>((resolve) => setModal({ title: o.title, message: o.message, confirmLabel: o.okLabel ?? 'Entendido', kind: 'alert', resolve: () => resolve() })), [])
  const notify = useCallback((o: NotifyOpts) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-3), { ...o, id }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), o.duration ?? 4000)
  }, [])

  const cerrar = (v: boolean) => { modal?.resolve(v); setModal(null) }
  useEffect(() => {
    if (!modal) return
    okRef.current?.focus()
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { modal.resolve(false); setModal(null) } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [modal])

  return (
    <Ctx.Provider value={{ confirm, alert, notify }}>
      {children}
      <AnimatePresence>
        {modal && (
          <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgb(5_6_8/.6)] sm:items-center" onClick={() => cerrar(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" onClick={(e) => e.stopPropagation()}
              className="tick w-full max-w-[440px] border border-rule bg-sheet p-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]"
              initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 28 }}>
              <h2 id="dlg-t" className="font-display text-xl font-semibold tracking-[-.02em]">{modal.title}</h2>
              {modal.message && <div className="mt-2 text-[16.5px] leading-relaxed text-ink-2">{modal.message}</div>}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                {modal.kind === 'confirm' && (
                  <button type="button" onClick={() => cerrar(false)} className="min-h-11 border border-rule-strong px-4 text-[15.5px] text-ink hover:bg-ink/5">
                    {modal.cancelLabel ?? 'Cancelar'}
                  </button>
                )}
                <button ref={okRef} type="button" onClick={() => cerrar(true)}
                  className={`min-h-11 px-4 text-[15.5px] font-medium active:scale-[.98] ${modal.destructive ? 'bg-bad text-ground' : 'bg-ink text-ground'}`}>
                  {modal.confirmLabel ?? 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const I = ICON[t.type ?? 'info']
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }}
                role={t.type === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-[400px] items-start gap-3 border border-rule bg-sheet p-4 shadow-paper">
                <I size={20} className={`mt-0.5 shrink-0 ${TONE[t.type ?? 'info']}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  {t.title && <p className="text-[15.5px] font-semibold">{t.title}</p>}
                  <p className="text-[15.5px] text-ink-2">{t.message}</p>
                </div>
                <button type="button" aria-label="Cerrar aviso" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                  className="-m-1 grid size-8 shrink-0 place-items-center text-ink-3 hover:text-ink"><X size={14} /></button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useDialog() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDialog debe usarse dentro de DialogProvider')
  return c
}
