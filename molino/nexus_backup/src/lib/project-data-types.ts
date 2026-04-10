'use client';

// ═══════════════════════════════════════════════════════════════════════
// PROJECT DATA — TYPE SYSTEM
// Gestión Documental Técnica de Ingeniería
// Compatible con Firebase SDK v9+ (modular)
// ═══════════════════════════════════════════════════════════════════════

/** Tipos de documento técnico de ingeniería */
export type DocumentType =
  | 'procedimiento'
  | 'reporte'
  | 'plano'
  | 'registro_inspeccion'
  | 'memoria_calculo'
  | 'otro';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  procedimiento: 'Procedimiento',
  reporte: 'Reporte',
  plano: 'Plano',
  registro_inspeccion: 'Registro de Inspección',
  memoria_calculo: 'Memoria de Cálculo',
  otro: 'Otro',
};

export const DOCUMENT_TYPE_PREFIXES: Record<DocumentType, string> = {
  procedimiento: 'PR',
  reporte: 'REP',
  plano: 'PL',
  registro_inspeccion: 'RI',
  memoria_calculo: 'MC',
  otro: 'DOC',
};

/** Folders in Cloud Storage mapped to document types */
export const DOCUMENT_TYPE_FOLDERS: Record<DocumentType, string> = {
  procedimiento: 'procedimientos',
  reporte: 'reportes',
  plano: 'planos',
  registro_inspeccion: 'registros_inspeccion',
  memoria_calculo: 'memorias_calculo',
  otro: 'otros',
};

/** Estado del ciclo de vida del documento */
export type DocumentStatus = 'borrador' | 'en_revisión' | 'aprobado' | 'devuelto' | 'obsoleto';

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  borrador: 'Borrador',
  en_revisión: 'En Revisión',
  aprobado: 'Aprobado',
  devuelto: 'Devuelto (NC)',
  obsoleto: 'Obsoleto',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, { bg: string; text: string; border: string; glow: string }> = {
  borrador: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.15)]' },
  en_revisión: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.15)]' },
  aprobado: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.15)]' },
  devuelto: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-[0_0_8px_rgba(249,115,22,0.15)]' },
  obsoleto: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.15)]' },
};

/** Disciplina de ingeniería */
export type Discipline = 'mecánica' | 'piping' | 'civil' | 'eléctrica' | 'instrumentación' | 'HSE' | 'QA/QC' | 'otro';

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  mecánica: 'Mecánica',
  piping: 'Piping',
  civil: 'Civil',
  eléctrica: 'Eléctrica',
  instrumentación: 'Instrumentación',
  HSE: 'HSE',
  'QA/QC': 'QA/QC',
  otro: 'Otro',
};

export const DISCIPLINE_PREFIXES: Record<Discipline, string> = {
  mecánica: 'MEC',
  piping: 'PIP',
  civil: 'CIV',
  eléctrica: 'ELE',
  instrumentación: 'INS',
  HSE: 'HSE',
  'QA/QC': 'QAC',
  otro: 'GEN',
};

export const DISCIPLINE_COLORS: Record<Discipline, string> = {
  mecánica: 'text-cyan-400',
  piping: 'text-violet-400',
  civil: 'text-orange-400',
  eléctrica: 'text-yellow-400',
  instrumentación: 'text-pink-400',
  HSE: 'text-green-400',
  'QA/QC': 'text-blue-400',
  otro: 'text-gray-400',
};

// ─────────────────────────────────────────────────────────────────────
// FILE VALIDATION
// ─────────────────────────────────────────────────────────────────────

/** Extensiones de archivo permitidas */
export const ALLOWED_FILE_EXTENSIONS = ['pdf', 'xlsx', 'docx', 'dwg', 'dxf', 'png', 'jpg', 'jpeg', 'xls', 'doc'] as const;

/** Tamaño máximo en bytes (50 MB) */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Validate file extension */
export function isAllowedFileType(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext);
}

/** Validate file size */
export function isFileSizeAllowed(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE_BYTES;
}

/** Format file size for display */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ─────────────────────────────────────────────────────────────────────
// DOCUMENT INTERFACE — FIRESTORE SCHEMA
// ─────────────────────────────────────────────────────────────────────

/** Represents a project document in Firestore `project_data` collection */
export interface ProjectDocument {
  document_id: string;
  project_code: string;
  project_name: string;
  client: string;
  contractor: string;
  document_type: DocumentType;
  title: string;
  revision: string;
  status: DocumentStatus;
  discipline: Discipline;
  tags: string[];
  uploaded_by: string;
  uploaded_by_uid: string;
  upload_date: string;
  last_modified: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size_kb: number;
  download_url: string;
  observations: string;
  related_equipment: string;
  linked_documents: string[];
}

/** Represents an action log in the document's trace history */
export interface AuditLog {
  id?: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'DOWNLOADED' | 'DOCUMENT_OBSOLETED' | 'RECHAZO CON NC';
  user_name: string;
  user_uid: string;
  timestamp: string; // ISO String
  details: string;   // e.g., "Status changed from borrador to en_revisión"
  previous_status?: DocumentStatus;
  new_status?: DocumentStatus;
}

/** Form data before upload (without auto-generated fields) */
export interface ProjectDocumentFormData {
  document_id?: string; // optional — auto-generated if empty
  project_code: string;
  project_name: string;
  client: string;
  contractor: string;
  document_type: DocumentType;
  title: string;
  revision: string;
  discipline: Discipline;
  tags: string;
  observations: string;
  related_equipment: string;
}

/** Filter state for the documents table */
export interface ProjectDataFilters {
  searchTerm: string;
  documentType: DocumentType | 'all';
  discipline: Discipline | 'all';
  status: DocumentStatus | 'all';
  projectCode: string;
}

/** Default filter state */
export const DEFAULT_FILTERS: ProjectDataFilters = {
  searchTerm: '',
  documentType: 'all',
  discipline: 'all',
  status: 'all',
  projectCode: '',
};

// ─────────────────────────────────────────────────────────────────────
// DOCUMENT ID GENERATOR
// ─────────────────────────────────────────────────────────────────────

/**
 * Generates a unique document_id in the format {TYPE_PREFIX}-{DISCIPLINE_PREFIX}-{NUMBER}
 * Example: PR-MEC-001, REP-PIP-012
 */
export function generateDocumentId(
  documentType: DocumentType,
  discipline: Discipline,
  existingIds: string[]
): string {
  const typePrefix = DOCUMENT_TYPE_PREFIXES[documentType];
  const discPrefix = DISCIPLINE_PREFIXES[discipline];
  const prefix = `${typePrefix}-${discPrefix}-`;

  // Find the highest existing number for this prefix
  let maxNum = 0;
  for (const id of existingIds) {
    if (id.startsWith(prefix)) {
      const numPart = parseInt(id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `${prefix}${nextNum}`;
}

/** Get file extension from filename */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/** Build storage path */
export function buildStoragePath(
  projectCode: string,
  documentType: DocumentType,
  documentId: string,
  revision: string,
  fileName: string
): string {
  const folder = DOCUMENT_TYPE_FOLDERS[documentType];
  const ext = getFileExtension(fileName);
  const sanitizedRev = revision.replace(/\./g, '');
  return `projects/${projectCode}/${folder}/${documentId}_${sanitizedRev}.${ext}`;
}

/** Default project constants */
export const DEFAULT_PROJECT = {
  code: 'AMM_OC_20000',
  name: 'Marmato Lower Mine Expansion',
  client: 'Aris Mining',
  contractor: 'SGS ETSA – SIGA',
} as const;
