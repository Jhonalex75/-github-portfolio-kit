import * as xlsx from 'xlsx';
import { Firestore, writeBatch, doc } from 'firebase/firestore';

export interface PdtActivity {
  id: string; // Firebase Document ID (auto-generated or sanitized ActivityID)
  activityId: string;
  activityName: string;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  totalFloat: number;
  projectId: string;
  /** Seguimiento en obra vs línea base (mismo Activity ID que Primavera) */
  actualStartDate?: string;
  actualEndDate?: string;
  actualUpdatedAt?: string;
  /** Clasificación inferida — no almacenada en Firestore, se calcula en runtime */
  discipline?: string;
  equipment?: string;
}

/** Texto por defecto del parser cuando falta nombre — la UI puede ocultar estas filas */
export const PDT_UNTITLED_LABEL = "Actividad sin título";

export function isPdtActivityTitled(a: Pick<PdtActivity, "activityName">): boolean {
  const n = (a.activityName ?? "").trim();
  return n.length > 0 && n !== PDT_UNTITLED_LABEL;
}

export const parsePdtExcel = async (buffer: ArrayBuffer, projectId: string): Promise<PdtActivity[]> => {
  const workbook = xlsx.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Extraer como array de objetos genéricos
  const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

  return rawData.map((row: any) => {
    // Buscador tolerante de columnas típicas de Primavera P6 / MS Project exportadas
    const findValue = (keys: string[]) => {
      const foundKey = Object.keys(row).find(k => 
        keys.some(searchKey => k.toLowerCase().includes(searchKey.toLowerCase()))
      );
      return foundKey ? row[foundKey] : undefined;
    };

    const activityIdRaw = findValue(['Activity ID', 'id', 'Código', 'Task ID']);
    const activityId = String(activityIdRaw || Math.random().toString(36).substring(7));
    
    const activityName = String(findValue(['Description', 'Name', 'Actividad', 'Nombre', 'Task Name']) || PDT_UNTITLED_LABEL);
    
    // Extracción de Fechas
    const rawStart = findValue(['Start', 'Inicio']);
    const rawFinish = findValue(['Finish', 'Fin']);
    
    const parseDate = (d: any): string => {
      if (!d) return new Date().toISOString();
      if (d instanceof Date) return d.toISOString();
      if (typeof d === 'number') {
        const date = new Date((d - (25567 + 1)) * 86400 * 1000); // Excel serial a JS Date
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      }
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    };

    const startDate = parseDate(rawStart);
    const endDate = parseDate(rawFinish);

    // Duración y Progreso
    const progressRaw = findValue(['Performance %', 'Progress', 'Avance']);
    const progress = parseFloat(String(progressRaw).replace(/[^0-9.-]+/g,"")) || 0;

    const durationRaw = findValue(['Original Duration', 'Duration', 'Duración']);
    let duration = parseFloat(String(durationRaw).replace(/[^0-9.-]+/g,""));
    if (isNaN(duration)) duration = 1;

    // Ruta Crítica (Float)
    const floatRaw = findValue(['Total Float', 'Holgura']);
    let totalFloat = parseFloat(String(floatRaw).replace(/[^0-9.-]+/g,""));
    if (isNaN(totalFloat)) totalFloat = 0;

    // Sanitizar ID para Firestore (no slashes)
    function sanitizeId(id: string) {
      return id.replace(/[^a-zA-Z0-9-]/g, '_');
    }

    return {
      id: sanitizeId(activityId),
      activityId,
      activityName,
      startDate,
      endDate,
      duration,
      progress: Math.min(100, Math.max(0, progress)), // Limitar entre 0 y 100
      totalFloat,
      projectId
    };
  });
};

/**
 * Commits a large array of PDT activities to Cloud Firestore using Batched Writes.
 * Protects network bandwidth and complies with Firestore 500 writes/batch limit.
 */
export const batchUploadPdtActivities = async (
  firestore: Firestore,
  projectId: string,
  activities: PdtActivity[],
  onProgress?: (progress: number) => void
) => {
  const CHUNK_SIZE = 490; // Limit is 500, playing safe with 490
  
  for (let i = 0; i < activities.length; i += CHUNK_SIZE) {
    const chunk = activities.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(firestore);

    for (const act of chunk) {
      const docRef = doc(firestore, 'projects', projectId, 'pdt_activities', act.id);
      // set merged overrides existing data if the same Activity ID is uploaded
      batch.set(docRef, act, { merge: true });
    }

    await batch.commit();

    if (onProgress) {
      const percentage = Math.min(100, Math.round(((i + chunk.length) / activities.length) * 100));
      onProgress(percentage);
    }
  }
};

/**
 * Fusiona solo fechas de “PDT obra real” por Activity ID, sin borrar la línea base (startDate/endDate).
 * Útil para comparar en el Gantt contra el cronograma aprobado (Aris).
 */
export const batchMergePdtActualDates = async (
  firestore: Firestore,
  projectId: string,
  activities: PdtActivity[],
  onProgress?: (progress: number) => void
) => {
  const CHUNK_SIZE = 490;
  const now = new Date().toISOString();

  for (let i = 0; i < activities.length; i += CHUNK_SIZE) {
    const chunk = activities.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(firestore);

    for (const act of chunk) {
      const docRef = doc(firestore, "projects", projectId, "pdt_activities", act.id);
      batch.set(
        docRef,
        {
          actualStartDate: act.startDate,
          actualEndDate: act.endDate,
          actualUpdatedAt: now,
        },
        { merge: true }
      );
    }

    await batch.commit();

    if (onProgress) {
      const percentage = Math.min(100, Math.round(((i + chunk.length) / activities.length) * 100));
      onProgress(percentage);
    }
  }
};
