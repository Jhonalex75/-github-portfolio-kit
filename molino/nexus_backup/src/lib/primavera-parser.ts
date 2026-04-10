/**
 * Oracle Primavera Excel Parser
 * Parsea archivos Excel binarios y extrae datos de tareas
 */

import * as XLSX from 'xlsx';
import { PrimaveraTask, ExcelColumn, ParseOptions, PrimaveraAnalysis } from './primavera-types';
import { logger } from './logger';

export class PrimaveraExcelParser {
  private columns: ExcelColumn[] = [];
  private options: ParseOptions;

  constructor(options: ParseOptions = {}) {
    this.options = {
      skipHeaderRows: 0,
      dateFormat: 'dd/MM/yyyy',
      wbsDelimiter: '.',
      ...options,
    };
  }

  /**
   * Parsea un archivo Excel y extrae tareas
   */
  async parseFile(file: File): Promise<PrimaveraAnalysis> {
    try {
      logger.debug(`Parsing Primavera file: ${file.name}`, 'PrimaveraExcelParser');

      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const tasks = await this.extractTasks(arrayBuffer);

      logger.log(
        `Successfully parsed ${tasks.length} tasks from ${file.name}`,
        'PrimaveraExcelParser'
      );

      return this.analyzeTasks(tasks, file.name);
    } catch (error) {
      logger.error(
        'Error parsing Primavera file',
        error instanceof Error ? error : new Error(String(error)),
        'PrimaveraExcelParser',
        { fileName: file.name }
      );
      throw error;
    }
  }

  /**
   * Detecta y mapea columnas automáticamente
   */
  private detectColumns(headers: string[]): ExcelColumn[] {
    const columnMapping = new Map<string, Partial<ExcelColumn>>([
      ['id', { field: 'id', dataType: 'string' }],
      ['name', { field: 'name', dataType: 'string' }],
      ['activity', { field: 'name', dataType: 'string' }],
      ['task', { field: 'name', dataType: 'string' }],
      ['start', { field: 'startDate', dataType: 'date' }],
      ['end', { field: 'endDate', dataType: 'date' }],
      ['duration', { field: 'duration', dataType: 'number' }],
      ['percent', { field: 'percentComplete', dataType: 'number' }],
      ['critical', { field: 'isOnCriticalPath', dataType: 'boolean' }],
      ['wbs', { field: 'rawWBS', dataType: 'string' }],
      ['area', { field: 'area', dataType: 'string' }],
      ['frente', { field: 'frontOfWork', dataType: 'string' }],
      ['front', { field: 'frontOfWork', dataType: 'string' }],
      ['slack', { field: 'slack', dataType: 'number' }],
    ]);

    return headers.map((header, index) => {
      const normalized = header.toLowerCase().trim();
      const mapping = columnMapping.get(normalized);

      if (mapping) {
        return { index, header, ...mapping } as ExcelColumn;
      }

      return { index, header, field: 'name', dataType: 'string' } as ExcelColumn;
    });
  }

  /**
   * Extrae WBS (Área) del código de actividad
   */
  private extractWBS(activityCode: string): { wbs: string; area: string } {
    if (!activityCode) {
      return { wbs: '', area: '' };
    }

    const parts = activityCode.split(this.options.wbsDelimiter!);

    // El primer nivel es típicamente el área principal
    const area = parts[0] || '';
    const wbs = parts.join(this.options.wbsDelimiter!);

    return { wbs, area };
  }

  /**
   * Parsea un valor de fecha
   */
  private parseDate(value: any): Date | undefined {
    if (!value) return undefined;

    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      try {
        return new Date(value);
      } catch {
        return undefined;
      }
    }
    if (typeof value === 'number') {
      // Excel date number
      return new Date((value - 25569) * 86400 * 1000);
    }

    return undefined;
  }

  /**
   * Lee archivo como ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Extrae tareas del archivo Excel
   */
  private async extractTasks(arrayBuffer: ArrayBuffer): Promise<PrimaveraTask[]> {
    try {
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      if (!worksheet) {
        throw new Error('No worksheet found in Excel file');
      }

      // Leer datos como JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
      
      if (data.length === 0) {
        throw new Error('No data found in Excel sheet');
      }

      // Detectar columnas usando los encabezados del JSON
      const headerRow = Object.keys(data[0] || {});
      this.columns = this.detectColumns(headerRow);

      if (this.columns.length === 0) {
        throw new Error('Could not detect Primavera columns in Excel file');
      }

      logger.debug(
        `Detected columns: ${this.columns.map((c) => c.header).join(', ')}`,
        'PrimaveraExcelParser'
      );

      // Convertir filas de datos a tareas
      const tasks: PrimaveraTask[] = data
        .map((row: any, index: number) => {
          try {
            const task: PrimaveraTask = {
              id: '',
              name: '',
              startDate: new Date(),
              endDate: new Date(),
              duration: 0,
              percentComplete: 0,
              predecessors: [],
              isOnCriticalPath: false,
              frontOfWork: '',
              wbs: '',
              area: '',
              originalCode: '',
              slack: 0,
            };

            // Mapear columnas detectadas
            this.columns.forEach((col) => {
              // Buscar el valor en la fila usando el encabezado original
              const excelValue = row[col.header];
              
              if (excelValue !== undefined && excelValue !== '') {
                switch (col.dataType) {
                  case 'string':
                    (task as any)[col.field] = String(excelValue).trim();
                    break;
                  case 'number':
                    (task as any)[col.field] = Number(excelValue) || 0;
                    break;
                  case 'date':
                    (task as any)[col.field] = this.parseDate(excelValue);
                    break;
                  case 'boolean':
                    (task as any)[col.field] = Boolean(excelValue);
                    break;
                }
              }
            });

            // Extraer WBS del código de actividad
            if (task.id) {
              task.originalCode = task.id;
              const wbsData = this.extractWBS(task.id);
              task.wbs = wbsData.wbs;
              task.area = wbsData.area;
            }

            // Calcular ruta crítica (si slack = 0)
            task.isOnCriticalPath = task.slack === 0;

            // Validar datos mínimos
            if (!task.id || !task.name) {
              logger.warn(
                `Skipping row ${index}: missing ID or name`,
                'PrimaveraExcelParser'
              );
              return null;
            }

            return task;
          } catch (error) {
            logger.warn(
              `Failed to parse row ${index}`,
              'PrimaveraExcelParser'
            );
            return null;
          }
        })
        .filter((task): task is PrimaveraTask => task !== null);

      logger.log(
        `Extracted ${tasks.length} valid tasks from ${data.length} rows`,
        'PrimaveraExcelParser'
      );

      return tasks;
    } catch (error) {
      logger.error(
        'Error extracting tasks from Excel',
        error instanceof Error ? error : new Error(String(error)),
        'PrimaveraExcelParser'
      );
      throw error;
    }
  }

  /**
   * Calcula estadísticas y analiza tareas
   */
  private analyzeTasks(tasks: PrimaveraTask[], fileName: string): PrimaveraAnalysis {
    const criticalPathTasks = tasks.filter((t) => t.isOnCriticalPath);

    const criticalPathDuration = criticalPathTasks.reduce((sum, task) => {
      return sum + (task.duration || 0);
    }, 0);

    const frontOfWorks = [...new Set(tasks.map((t) => t.frontOfWork).filter(Boolean))];
    const areas = [...new Set(tasks.map((t) => t.area).filter(Boolean))];

    return {
      tasks,
      totalTasks: tasks.length,
      criticalPathTasks,
      criticalPathDuration,
      frontOfWorks,
      areas,
      importDate: new Date(),
      fileName,
    };
  }
}

/**
 * Helper para parsear Primavera
 */
export async function parsePrimaveraFile(
  file: File,
  options?: ParseOptions
): Promise<PrimaveraAnalysis> {
  const parser = new PrimaveraExcelParser(options);
  return parser.parseFile(file);
}
