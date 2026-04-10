export type NCStatus = "abierto" | "en_proceso" | "cerrado" | "anulado";
export type NCSeverity = "baja" | "media" | "alta" | "crítica";
export type NCOrigin = "auditoria" | "inspeccion" | "revision_documental" | "reporte_terceros" | "otro";

export interface NonConformity {
  nc_id: string; // e.g., NC-2026-0001
  project_code: string;
  title: string;
  description: string;
  status: NCStatus;
  severity: NCSeverity;
  origin: NCOrigin;
  related_document_id?: string; // Links to ProjectData Document
  related_equipment?: string;
  reported_by: string;
  reported_by_uid: string;
  assigned_to?: string;
  creation_date: string; // ISO string
  target_date?: string; // Target closure date
  closure_date?: string; // Actual closure date
  root_cause?: string;
  correction_plan?: string;
  observations?: string;
}

export interface NCFormData {
  nc_id?: string;
  project_code: string;
  title: string;
  description: string;
  severity: NCSeverity;
  origin: NCOrigin;
  related_document_id?: string;
  related_equipment?: string;
  assigned_to?: string;
  target_date?: string;
  observations?: string;
}

export const NC_STATUS_LABELS: Record<NCStatus, string> = {
  abierto: "Abierto",
  en_proceso: "En Proceso",
  cerrado: "Cerrado",
  anulado: "Anulado",
};

export const NC_SEVERITY_LABELS: Record<NCSeverity, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  crítica: "Crítica",
};

export const NC_ORIGIN_LABELS: Record<NCOrigin, string> = {
  auditoria: "Auditoría",
  inspeccion: "Inspección de Campo",
  revision_documental: "Revisión Documental",
  reporte_terceros: "Reporte de Terceros",
  otro: "Otro",
};

export const NC_STATUS_COLORS: Record<NCStatus, { bg: string; text: string; border: string; glow: string }> = {
  abierto: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", glow: "shadow-[0_0_10px_rgba(239,68,68,0.3)]" },
  en_proceso: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-[0_0_10px_rgba(59,130,246,0.3)]" },
  cerrado: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-[0_0_10px_rgba(16,185,129,0.3)]" },
  anulado: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30", glow: "shadow-[0_0_10px_rgba(100,116,139,0.3)]" },
};

export const NC_SEVERITY_COLORS: Record<NCSeverity, string> = {
  baja: "text-emerald-400",
  media: "text-yellow-400",
  alta: "text-orange-400",
  crítica: "text-red-500 font-bold",
};

// ═══════════════════════════════════════════════════════════════
// EQUIPMENT LIFE RECORD — Hoja de Vida por Equipo
// ═══════════════════════════════════════════════════════════════

export type OperationalStatus = "sin_iniciar" | "en_montaje" | "comisionando" | "operativo";

export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  sin_iniciar: "Sin Iniciar",
  en_montaje: "En Montaje",
  comisionando: "Comisionando",
  operativo: "Operativo",
};

export const OPERATIONAL_STATUS_COLORS: Record<
  OperationalStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  sin_iniciar:  { bg: "bg-slate-500/10",   text: "text-slate-400",   border: "border-slate-500/30",   dot: "bg-slate-400"   },
  en_montaje:   { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/30",  dot: "bg-yellow-400"  },
  comisionando: { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/30",    dot: "bg-blue-400"    },
  operativo:    { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
};

export type ActivityType =
  | "inspeccion"
  | "torque"
  | "alineamiento"
  | "prueba_en_vacio"
  | "prueba_carga"
  | "limpieza"
  | "izaje"
  | "otro";

export type ActivityStatus = "pendiente" | "en_proceso" | "completado";

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  inspeccion:     "Inspección Visual",
  torque:         "Torque / Apriete",
  alineamiento:   "Alineamiento",
  prueba_en_vacio:"Prueba en Vacío",
  prueba_carga:   "Prueba bajo Carga",
  limpieza:       "Limpieza / Preservación",
  izaje:          "Izaje / Posicionamiento",
  otro:           "Otro",
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  pendiente:  "Pendiente",
  en_proceso: "En Proceso",
  completado: "Completado",
};

export const ACTIVITY_STATUS_COLORS: Record<ActivityStatus, string> = {
  pendiente:  "text-slate-400  border-slate-500/30  bg-slate-500/10",
  en_proceso: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  completado: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
};

export interface AssemblyActivity {
  id: string;
  equipment_tag: string;
  type: ActivityType;
  description: string;
  responsible: string;
  date: string; // YYYY-MM-DD
  status: ActivityStatus;
  observations?: string;
  photo_urls?: string[];     // Firebase Storage download URLs
  photo_paths?: string[];    // Firebase Storage paths (for deletion)
  created_by: string;
  created_by_uid: string;
  created_at: string;
}

export interface NewActivityData {
  type: ActivityType;
  description: string;
  responsible: string;
  date: string;         // YYYY-MM-DD
  status: ActivityStatus;
  observations?: string;
}

export interface EquipmentRecord {
  tag: string;
  operational_status: OperationalStatus;
  last_updated: string;
  updated_by: string;
}

// ═══════════════════════════════════════════════════════════════
// ASSEMBLY STEPS — Plan Detallado de Montaje con Avance %
// ═══════════════════════════════════════════════════════════════

export type AssemblyStepStatus = "pendiente" | "en_proceso" | "completado" | "omitido";

export interface AssemblyStep {
  id: string;
  equipment_tag: string;
  step_number: number;
  title: string;
  description: string;
  weight_pct: number;        // Contribución al avance total (suma = 100)
  status: AssemblyStepStatus;
  responsible?: string;
  start_date?: string;       // YYYY-MM-DD
  completion_date?: string;  // YYYY-MM-DD
  photo_urls?: string[];
  photo_paths?: string[];
  observations?: string;
  iom_ref?: string;          // Referencia sección IOM Manual
  proc_ref?: string;         // Referencia sección PRO-0038
  updated_by?: string;
  updated_at?: string;
}

export const ASSEMBLY_STEP_STATUS_LABELS: Record<AssemblyStepStatus, string> = {
  pendiente:  "Pendiente",
  en_proceso: "En Proceso",
  completado: "Completado",
  omitido:    "Omitido / N/A",
};

export const ASSEMBLY_STEP_STATUS_COLORS: Record<AssemblyStepStatus, { bg: string; text: string; border: string; dot: string }> = {
  pendiente:  { bg: "bg-slate-500/10",   text: "text-slate-400",   border: "border-slate-500/30",   dot: "bg-slate-400"   },
  en_proceso: { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/30",  dot: "bg-yellow-400"  },
  completado: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  omitido:    { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/30",  dot: "bg-purple-400"  },
};

/** Calcula el avance ponderado total (0-100) */
export function calcAssemblyProgress(steps: AssemblyStep[]): number {
  if (!steps.length) return 0;
  return steps.reduce((acc, s) => {
    if (s.status === "completado") return acc + s.weight_pct;
    if (s.status === "en_proceso") return acc + s.weight_pct * 0.5;
    return acc;
  }, 0);
}

// ═══════════════════════════════════════════════════════════════
// PUNCH LIST — Registro de Asuntos Pendientes Constructivos
// ═══════════════════════════════════════════════════════════════

export type PunchDiscipline = "civil" | "mecanica" | "electrica" | "instrumentacion" | "piping" | "otro";
export type PunchPriority   = "A" | "B" | "C";
export type PunchStatus     = "abierto" | "en_gestion" | "cerrado";

export interface PunchListItem {
  id: string;
  equipment_tag: string;
  item_number?: string;          // Ej. PEND-SAG-001
  description: string;
  discipline: PunchDiscipline;
  priority: PunchPriority;
  responsible?: string;
  due_date?: string;             // YYYY-MM-DD
  status: PunchStatus;
  photo_urls?: string[];
  photo_paths?: string[];
  root_cause?: string;
  corrective_action?: string;
  created_by: string;
  created_by_uid: string;
  created_at: string;
  closed_at?: string;
  closed_by?: string;
}

export const PUNCH_DISCIPLINE_LABELS: Record<PunchDiscipline, string> = {
  civil:           "Civil / Estructuras",
  mecanica:        "Mecánica",
  electrica:       "Eléctrica",
  instrumentacion: "Instrumentación / Control",
  piping:          "Piping / Tuberías",
  otro:            "Otro",
};

export const PUNCH_PRIORITY_LABELS: Record<PunchPriority, string> = {
  A: "A — Bloqueante",
  B: "B — Importante",
  C: "C — Menor",
};

export const PUNCH_STATUS_LABELS: Record<PunchStatus, string> = {
  abierto:    "Abierto",
  en_gestion: "En Gestión",
  cerrado:    "Cerrado",
};

export const PUNCH_STATUS_COLORS: Record<PunchStatus, { bg: string; text: string; border: string }> = {
  abierto:    { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/30"     },
  en_gestion: { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/30"  },
  cerrado:    { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
};

export const PUNCH_PRIORITY_COLORS: Record<PunchPriority, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-red-600/20",    text: "text-red-300",    border: "border-red-600/40"    },
  B: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  C: { bg: "bg-slate-500/10",  text: "text-slate-400",  border: "border-slate-500/30"  },
};
