/** Gestiona el tema de la web y proporciona el estado de apariencia a React. */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/** 'system' = sigue al dispositivo; 'light' | 'dark' = elección guardada del usuario. */
export type ThemeChoice = 'system' | 'light' | 'dark'
type Effective = 'light' | 'dark'

const KEY = 'nodo-vincula.theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

const Ctx = createContext<{ choice: ThemeChoice; theme: Effective; setChoice: (c: ThemeChoice) => void; toggle: () => void } | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice)
  const [system, setSystem] = useState<Effective>(() => (media().matches ? 'dark' : 'light'))
  const theme: Effective = choice === 'system' ? system : choice

  useEffect(() => {
    const m = media()
    const on = () => setSystem(m.matches ? 'dark' : 'light')
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c)
    try {
      if (c === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, c)
    } catch { /* sin almacenamiento: la elección dura la sesión */ }
  }, [])

  const toggle = useCallback(() => setChoice(theme === 'dark' ? 'light' : 'dark'), [theme, setChoice])

  return <Ctx.Provider value={{ choice, theme, setChoice, toggle }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return c
}
