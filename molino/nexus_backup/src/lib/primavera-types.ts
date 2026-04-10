/**
 * Oracle Primavera Types
 * Tipos TypeScript para estructuras de Oracle Primavera
 */

export interface PrimaveraTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  percentComplete: number;
  predecessors: string[]; // IDs de tareas predecesoras
  isOnCriticalPath: boolean;
  frontOfWork: string; // "Primer Oro", "Segundo Nivel", etc.
  wbs: string; // Work Breakdown Structure - extraído automáticamente
  area: string; // Área del WBS
  originalCode: string; // Código original de la actividad
  slack: number; // Holgura (days)
  baselineStart?: Date;
  baselineEnd?: Date;
}

export interface ExcelColumn {
  index: number;
  header: string;
  field: keyof PrimaveraTask | 'rawWBS' | 'slack';
  dataType: 'string' | 'number' | 'date' | 'boolean';
}

export interface ParseOptions {
  skipHeaderRows?: number;
  dateFormat?: string;
  wbsDelimiter?: string; // Por defecto "."
}

export interface PrimaveraAnalysis {
  tasks: PrimaveraTask[];
  totalTasks: number;
  criticalPathTasks: PrimaveraTask[];
  criticalPathDuration: number;
  frontOfWorks: string[];
  areas: string[];
  importDate: Date;
  fileName: string;
}

export interface FilterOptions {
  frontOfWork?: string[];
  isCriticalPath?: boolean;
  areaCode?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
}

export interface GridRow {
  task: PrimaveraTask;
  depth: number; // Profundidad en el árbol WBS
  isExpanded: boolean;
  children: GridRow[];
}
