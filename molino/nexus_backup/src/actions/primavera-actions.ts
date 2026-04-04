/**
 * Primavera Analysis Actions
 * Server Actions para operaciones seguras del módulo
 */

'use server';

import { PrimaveraAnalysis } from '@/lib/primavera-types';
import { logger } from '@/lib/logger';

/**
 * Procesa análisis de tareas en el servidor
 * Útil para datos muy grandes o cálculos pesados
 */
export async function processPrimaveraAnalysis(
  analysis: PrimaveraAnalysis,
  userId: string
) {
  try {
    logger.debug(
      `Processing Primavera analysis for user ${userId}`,
      'processPrimaveraAnalysis'
    );

    // Calcular métricas adicionales
    const metricsData = {
      totalTasks: analysis.totalTasks,
      criticalPathTasks: analysis.criticalPathTasks.length,
      criticalPathDurationDays: analysis.criticalPathDuration,
      averageTaskDuration:
        analysis.tasks.reduce((sum, t) => sum + t.duration, 0) /
        analysis.tasks.length,
      averageProgress:
        analysis.tasks.reduce((sum, t) => sum + t.percentComplete, 0) /
        analysis.tasks.length,
      frontOfWorksCount: analysis.frontOfWorks.length,
      areasCount: analysis.areas.length,
      completedTasks: analysis.tasks.filter((t) => t.percentComplete === 100)
        .length,
    };

    logger.log(
      'Primavera analysis processed successfully',
      'processPrimaveraAnalysis',
      metricsData
    );

    return {
      success: true,
      metrics: metricsData,
    };
  } catch (error) {
    logger.error(
      'Error processing Primavera analysis',
      error instanceof Error ? error : new Error(String(error)),
      'processPrimaveraAnalysis'
    );

    throw error;
  }
}

/**
 * Exporta análisis a formato JSON
 */
export async function exportAnalysisAsJSON(
  analysis: PrimaveraAnalysis,
  userId: string
) {
  try {
    logger.log(
      `Exporting analysis as JSON for user ${userId}`,
      'exportAnalysisAsJSON'
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      fileName: analysis.fileName,
      summary: {
        totalTasks: analysis.totalTasks,
        criticalPathTasks: analysis.criticalPathTasks.length,
        criticalPathDuration: analysis.criticalPathDuration,
        frontOfWorks: analysis.frontOfWorks,
        areas: analysis.areas,
      },
      tasks: analysis.tasks,
    };

    return {
      success: true,
      data: exportData,
      size: JSON.stringify(exportData).length,
    };
  } catch (error) {
    logger.error(
      'Error exporting analysis',
      error instanceof Error ? error : new Error(String(error)),
      'exportAnalysisAsJSON'
    );

    throw error;
  }
}

/**
 * Calcula estadísticas de rutas críticas
 */
export async function calculateCriticalPathStats(
  analysis: PrimaveraAnalysis
) {
  try {
    const cpTasks = analysis.criticalPathTasks;

    const stats = {
      totalCriticalTasks: cpTasks.length,
      totalCriticalDuration: analysis.criticalPathDuration,
      averageTaskDuration:
        cpTasks.reduce((sum, t) => sum + t.duration, 0) / cpTasks.length || 0,
      completedCriticalTasks: cpTasks.filter((t) => t.percentComplete === 100)
        .length,
      completionPercentage: Math.round(
        (cpTasks.filter((t) => t.percentComplete === 100).length /
          cpTasks.length) *
          100
      ),
      criticalTasksByArea: Object.entries(
        cpTasks.reduce(
          (acc, task) => {
            acc[task.area] = (acc[task.area] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        )
      ),
    };

    logger.log(
      'Critical path stats calculated',
      'calculateCriticalPathStats',
      stats
    );

    return stats;
  } catch (error) {
    logger.error(
      'Error calculating critical path stats',
      error instanceof Error ? error : new Error(String(error)),
      'calculateCriticalPathStats'
    );

    throw error;
  }
}
