/** Centraliza el contenido reutilizado en las pantallas públicas y el prototipo. */

/**
 * Contenido de NODO Vincula. Cada afirmación describe una función que existe hoy
 * en el sistema (ver la auditoría). Sin cifras, testimonios ni promesas inventadas.
 */

export const SITE = {
  name: 'NODO Vincula',
  institution: 'Instituto Tecnológico de Veracruz',
  institutionShort: 'Tec de Veracruz',
  /** Acceso a la app interna (misma web, como NODO). */
  appUrl: '/acceso',
  nodoUrl: 'https://nodo-tecnologico.vercel.app',
  support: {
    email: 'alvqrez.dev@gmail.com',
    github: 'https://github.com/Alvqrez',
    githubLabel: 'github.com/Alvqrez',
  },
} as const

export type RoleId = 'residente' | 'asesor' | 'vinculacion'

export const ROLES: { id: RoleId; label: string; title: string; summary: string; can: string[] }[] = [
  {
    id: 'residente',
    label: 'Residente',
    title: 'Sabes qué sigue y para cuándo.',
    summary: 'Tu proyecto, tu asesor y tus cinco reportes en una sola vista.',
    can: [
      'Entregas el reporte preliminar, los tres parciales y el final en PDF o DOCX.',
      'Ves la fecha límite de cada reporte, definida por Vinculación para tu período.',
      'Lees la retroalimentación de tu asesor y corriges lo que te pida.',
      'Declaras la fuente de tu proyecto: propia, banco de proyectos o empresa.',
      'Agendas citas con tu asesor y recibes avisos cuando revisa tus entregas.',
    ],
  },
  {
    id: 'asesor',
    label: 'Asesor',
    title: 'Revisas lo pendiente sin buscarlo.',
    summary: 'Los reportes de tus residentes llegan a una sola bandeja.',
    can: [
      'Revisas cada reporte con criterios, comentario y decisión: aceptar o pedir corrección.',
      'Registras la calificación del reporte final.',
      'Desbloqueas el siguiente reporte de un residente cuando hace falta.',
      'Solicitas a Vinculación el avance de fase del proyecto.',
      'Agendas citas con tus residentes y ellos las confirman.',
    ],
  },
  {
    id: 'vinculacion',
    label: 'Vinculación',
    title: 'Ves el departamento completo.',
    summary: 'Empresas, proyectos, asignaciones y seguimiento por período.',
    can: [
      'Registras residentes y asesores, y asignas proyecto, asesor y residentes.',
      'Gestionas empresas, convenios y los períodos con sus fechas límite.',
      'Apruebas el avance de fase de cada proyecto.',
      'Validas la fuente de cada proyecto y publicas documentos para cada rol.',
      'Consultas el seguimiento de entregas y las estadísticas por período.',
    ],
  },
]

/** Recorrido real de una residencia (el orden es información, por eso va numerado). */
export const STEPS: { folio: string; who: string; title: string; text: string }[] = [
  { folio: '01', who: 'Vinculación', title: 'Asignación', text: 'Registra el período con sus fechas límite, la empresa y el proyecto, y asigna asesor y residentes. Los cinco reportes quedan abiertos con su fecha.' },
  { folio: '02', who: 'Residente', title: 'Entrega', text: 'Sube el reporte preliminar y declara la fuente del proyecto. Cada archivo se valida: PDF o DOCX, hasta 10 MB.' },
  { folio: '03', who: 'Asesor', title: 'Revisión', text: 'Revisa con criterios y comentario. Acepta o pide corrección, y el residente recibe el aviso al momento.' },
  { folio: '04', who: 'Residente y asesor', title: 'Parciales y final', text: 'Los tres parciales se desbloquean en orden. El reporte final cierra con la calificación del asesor.' },
  { folio: '05', who: 'Vinculación', title: 'Avance y cierre', text: 'Aprueba el avance de fase que solicita el asesor: propuesto, desarrollo, revisión y concluido.' },
]

export const REPORTS = ['Preliminar', 'Parcial 1', 'Parcial 2', 'Parcial 3', 'Final'] as const

export const FEATURES: { title: string; text: string }[] = [
  { title: 'Entregas validadas', text: 'Solo PDF o DOCX de hasta 10 MB. El servidor revisa la extensión y el contenido real del archivo.' },
  { title: 'Retroalimentación con criterios', text: 'Cada revisión registra criterios, comentario y decisión; el final, además, la calificación.' },
  { title: 'Avisos en tiempo real', text: 'Entregas, revisiones, citas y validaciones llegan como aviso a quien le toca.' },
  { title: 'Citas compartidas', text: 'Presenciales o virtuales. La otra persona las confirma o cancela desde su calendario.' },
  { title: 'Fechas por período', text: 'Vinculación define las cinco fechas límite de cada período y todos las ven igual.' },
  { title: 'Fuente del proyecto', text: 'El residente la declara y Vinculación la valida o la rechaza con motivo.' },
  { title: 'Documentos por rol', text: 'Vinculación publica guías y formatos; cada rol descarga los suyos.' },
  { title: 'Empresas y convenios', text: 'Directorio con contacto, estado del convenio y residentes por empresa.' },
  { title: 'Seguimiento por período', text: 'Entregas, cumplimiento por empresa y alumnos por proyecto.' },
]

export const FAQ: { q: string; a: string }[] = [
  { q: '¿Quién crea mi cuenta?', a: 'La Jefatura de Vinculación registra a residentes y asesores. No hay registro abierto.' },
  { q: '¿Qué archivos puedo entregar?', a: 'PDF o DOCX de hasta 10 MB. Si el contenido no corresponde a la extensión, el archivo se rechaza.' },
  { q: '¿Puedo corregir un envío?', a: 'Puedes deshacer el envío el mismo día mientras siga en revisión. Si tu asesor pide corrección, vuelves a entregar.' },
  { q: '¿Cuándo se abre el siguiente reporte?', a: 'Los parciales se abren en orden conforme se aceptan. Tu asesor también puede desbloquear el siguiente.' },
  { q: '¿Dónde veo mis fechas límite?', a: 'En tu inicio y en cada reporte. Las define Vinculación para tu período.' },
  { q: '¿Qué relación tiene con NODO?', a: 'NODO Vincula es la app de residencias de la familia NODO, la red estudiantil del Tec de Veracruz.' },
]
