'use server';

import { generadorTitulos } from '@/ai/flows/generador-titulos';
import { withRetryAndRateLimit } from '@/lib/ai-utils';
import { logger } from '@/lib/logger';

export async function generarTituloAction(tema: string, userId: string) {
  try {
    logger.debug(`Generando título para el tema: ${tema}`, 'generarTituloAction');

    // Validate input
    if (!tema || tema.trim().length === 0) {
      logger.warn('Empty tema provided', 'generarTituloAction');
      return {
        success: false,
        titulo: "Tema requerido",
        subtitulo: "Por favor proporciona un tema válido.",
      };
    }

    if (!userId) {
      logger.warn('Missing userId for rate limiting', 'generarTituloAction');
      return {
        success: false,
        titulo: "Información de usuario requerida",
        subtitulo: "Por favor asegúrate de estar autenticado.",
      };
    }

    // Execute with retry and rate limiting
    const result = await withRetryAndRateLimit(
      () => generadorTitulos({ tema }),
      userId,
      'generadorTitulos',
      { maxAttempts: 3, initialDelay: 1000 }
    );

    if (!result.success) {
      logger.warn(
        `Fallo al generar título: ${result.error}`,
        'generarTituloAction',
        { tema, userId }
      );
      return {
        success: false,
        titulo: "Error de conexión",
        subtitulo: result.error || "Hubo un problema comunicándose con la IA. Intenta nuevamente.",
        remaining: result.remaining,
      };
    }

    logger.log('Título generado exitosamente', 'generarTituloAction');
    return {
      success: true,
      ...result.data,
      remaining: result.remaining,
    };
  } catch (error) {
    logger.critical(
      'Error crítico al generar título',
      error instanceof Error ? error : new Error(String(error)),
      'generarTituloAction',
      { tema, userId }
    );

    return {
      success: false,
      titulo: "Error inesperado",
      subtitulo: "Revisa tu consola para más detalles.",
    };
  }
}
