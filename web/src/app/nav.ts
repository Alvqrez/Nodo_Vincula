import type { ComponentType } from 'react'
import {
  Bell, Briefcase, Buildings, CalendarBlank, ChartBar, Checks, FileText, Folder, House, Signature,
  UserCircle, UserPlus, Users, type IconProps,
} from '@phosphor-icons/react'
import type { Rol } from '@/lib/session'

export type NavItem = { to: string; label: string; icon: ComponentType<IconProps>; children?: { to: string; label: string }[]; avisos?: boolean; keywords?: string }

/** Menús por rol: los mismos destinos que la app actual. */
export const MENU: Record<Rol, NavItem[]> = {
  residente: [
    { to: '/app', label: 'Inicio', icon: House },
    { to: '/app/seguimiento', label: 'Seguimiento', icon: Checks, keywords: 'avance estado reportes' },
    { to: '/app/fuente', label: 'Fuente del proyecto', icon: Signature, keywords: 'propia banco empresa validar' },
    {
      to: '/app/reportes', label: 'Reportes', icon: FileText, keywords: 'entregar subir pdf docx',
      children: [
        { to: '/app/reportes/preliminar', label: 'Preliminar' },
        { to: '/app/reportes/parciales', label: 'Parciales' },
        { to: '/app/reportes/final', label: 'Final' },
      ],
    },
    { to: '/app/avisos', label: 'Avisos', icon: Bell, avisos: true, keywords: 'notificaciones' },
    { to: '/app/calendario', label: 'Calendario', icon: CalendarBlank, keywords: 'citas reuniones' },
    { to: '/app/perfil', label: 'Perfil', icon: UserCircle, keywords: 'foto tema documentos recursos contactos' },
  ],
  asesor: [
    { to: '/app', label: 'Inicio', icon: House },
    { to: '/app/proyectos', label: 'Proyectos', icon: Folder, keywords: 'avance fase' },
    { to: '/app/revision', label: 'Revisión', icon: FileText, keywords: 'reportes revisar calificar' },
    { to: '/app/avisos', label: 'Avisos', icon: Bell, avisos: true, keywords: 'notificaciones' },
    { to: '/app/calendario', label: 'Calendario', icon: CalendarBlank, keywords: 'citas reuniones' },
    { to: '/app/perfil', label: 'Perfil', icon: UserCircle, keywords: 'foto tema documentos recursos' },
  ],
  jefe: [
    { to: '/app', label: 'Inicio', icon: House },
    { to: '/app/empresas', label: 'Empresas', icon: Buildings, keywords: 'convenios' },
    { to: '/app/proyectos', label: 'Proyectos', icon: Briefcase, keywords: 'tablero fase avance' },
    { to: '/app/asignacion', label: 'Asignación', icon: UserPlus, keywords: 'asignar asesor residente' },
    { to: '/app/seguimiento', label: 'Seguimiento', icon: Checks, keywords: 'entregas reportes' },
    { to: '/app/fuentes', label: 'Fuentes', icon: Signature, keywords: 'validar fuente proyecto' },
    { to: '/app/estadisticas', label: 'Estadísticas', icon: ChartBar, keywords: 'período cumplimiento' },
    { to: '/app/avisos', label: 'Avisos', icon: Bell, avisos: true, keywords: 'notificaciones' },
    { to: '/app/calendario', label: 'Calendario', icon: CalendarBlank, keywords: 'citas' },
    { to: '/app/administracion', label: 'Administración', icon: Users, keywords: 'residentes asesores períodos registrar' },
    { to: '/app/perfil', label: 'Perfil', icon: UserCircle, keywords: 'foto tema documentos recursos' },
  ],
}

/** Los 4 destinos de la barra inferior en celular, por rol (el resto va en "Más"). */
export const MOVIL: Record<Rol, string[]> = {
  residente: ['/app', '/app/reportes', '/app/calendario', '/app/avisos'],
  asesor: ['/app', '/app/revision', '/app/proyectos', '/app/calendario'],
  jefe: ['/app', '/app/seguimiento', '/app/proyectos', '/app/fuentes'],
}

/** action_screen de los avisos del backend → ruta de la app web. */
export function rutaDeAviso(screen: string | null | undefined, rol: Rol): string | null {
  switch (screen) {
    case 'calendario': return '/app/calendario'
    case 'fuentes': return rol === 'jefe' ? '/app/fuentes' : '/app/fuente'
    case 'fuente-proyecto': return '/app/fuente'
    case 'reportes': return rol === 'asesor' ? '/app/revision' : '/app/seguimiento'
    case 'seguimiento': return '/app/seguimiento'
    case 'proyectos': return '/app/proyectos'
    default: return null
  }
}
