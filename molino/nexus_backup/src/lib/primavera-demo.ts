/**
 * Primavera Demo Helper
 * Facilita testing del módulo sin archivo Excel real
 */

import { PrimaveraTask, PrimaveraAnalysis } from './primavera-types';
import { SAMPLE_PRIMAVERA_TASKS } from './primavera-test-data';

/**
 * Convierte datos de prueba a PrimaveraAnalysis completo
 */
export function createDemoAnalysis(): PrimaveraAnalysis {
  const tasks: PrimaveraTask[] = SAMPLE_PRIMAVERA_TASKS.map((row: any) => {
    const startDate = new Date(row['Start Date']);
    const endDate = new Date(row['End Date']);
    const predecessorIds = row['Predecessors'] 
      ? row['Predecessors'].split(',').map((id: string) => id.trim())
      : [];

    // Extraer WBS del Activity Code
    const activityCode = row['Activity Code'];
    const wbsParts = activityCode.split('.');
    const area = wbsParts[0];

    return {
      id: row.ID,
      name: row['Activity Name'],
      startDate,
      endDate,
      duration: row['Duration (Days)'],
      percentComplete: row['% Complete'],
      predecessors: predecessorIds,
      isOnCriticalPath: row['Slack (Days)'] === 0,
      frontOfWork: area === '02' ? 'Primo Oro' : area === '03' ? 'Segundo Nivel' : 'Base',
      wbs: activityCode,
      area,
      originalCode: activityCode,
      slack: row['Slack (Days)'],
    };
  });

  const criticalPathTasks = tasks.filter(t => t.isOnCriticalPath);
  const frontOfWorks = [...new Set(tasks.map(t => t.frontOfWork))];
  const areas = [...new Set(tasks.map(t => t.area))];

  const criticalPathDuration = criticalPathTasks.reduce((sum, task) => {
    return sum + (task.duration || 0);
  }, 0);

  return {
    tasks,
    totalTasks: tasks.length,
    criticalPathTasks,
    criticalPathDuration,
    frontOfWorks: Array.from(frontOfWorks),
    areas: Array.from(areas),
    importDate: new Date(),
    fileName: 'demo_primavera_project.xlsx',
  };
}

/**
 * Genera archivo CSV descargable desde demo data
 */
export function downloadDemoAsCSV() {
  const rows = SAMPLE_PRIMAVERA_TASKS;
  
  // Headers
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => {
        const value = (row as any)[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    ),
  ].join('\n');

  // Crear blob y descargar
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'primavera_demo_data.csv';
  link.click();
}

/**
 * Genera archivo JSON descargable con análisis completo
 */
export function downloadDemoAnalysisAsJSON() {
  const analysis = createDemoAnalysis();
  const jsonContent = JSON.stringify(analysis, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'primavera_demo_analysis.json';
  link.click();
}

/**
 * Estadísticas del demo
 */
export function getDemoStats() {
  const analysis = createDemoAnalysis();
  
  return {
    totalActivities: analysis.tasks.length,
    criticalPathActivities: analysis.criticalPathTasks.length,
    projectDuration: analysis.criticalPathDuration,
    completionPercentage: (
      analysis.tasks.reduce((sum, t) => sum + t.percentComplete, 0) / 
      analysis.tasks.length
    ).toFixed(1),
    frontsOfWork: analysis.frontOfWorks.length,
    wbsAreas: analysis.areas.length,
    tasksWithSlack: analysis.tasks.filter(t => t.slack > 0).length,
    completedTasks: analysis.tasks.filter(t => t.percentComplete === 100).length,
  };
}

/**
 * Descripción del demo project
 */
export const DEMO_PROJECT_DESCRIPTION = {
  name: 'Construcción de Centro de Procesamiento de Datos',
  description: 'Proyecto de infraestructura de 10 actividades principales con ruta crítica de 5 niveles',
  duration: '~500 días',
  structure: [
    { code: '01', name: 'PREPARACIÓN', duration: '60 días', progress: '85%' },
    { code: '02', name: 'INSTALACIONES MECÁNICAS Y ELÉCTRICAS', duration: '200 días', progress: '0%' },
    { code: '03', name: 'ACABADOS Y EQUIPAMIENTO', duration: '240 días', progress: '0%' },
  ],
  criticalPath: 'A1001 → A1002 → A1003 → A1004 → A1005 → A1008 → A1009 → A1010',
  notes: 'Demo para validar parsing de Primavera, cálculo de ruta crítica, y virtualización de grid',
};
