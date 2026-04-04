'use server';
/**
 * @fileOverview Un flujo de Genkit para generar títulos de reportes técnicos.
 * Incluye validación y manejo robusto de errores.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';

const GeneradorTitulosInputSchema = z.object({
  tema: z.string().min(1, 'Theme is required').max(500, 'Theme too long').describe('El tema del reporte técnico del molino.'),
});
export type GeneradorTitulosInput = z.infer<typeof GeneradorTitulosInputSchema>;

const GeneradorTitulosOutputSchema = z.object({
  titulo: z.string().describe('Un título formal y profesional para el reporte.'),
  subtitulo: z.string().describe('Un subtítulo corto descriptivo.'),
});
export type GeneradorTitulosOutput = z.infer<typeof GeneradorTitulosOutputSchema>;

export async function generadorTitulos(input: GeneradorTitulosInput): Promise<GeneradorTitulosOutput> {
  try {
    // Validate input
    const validatedInput = GeneradorTitulosInputSchema.parse(input);
    
    return await generadorTitulosFlow(validatedInput);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Input validation failed', 'generadorTitulos', { 
        errors: error.errors 
      });
      throw new Error(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

const tituloPrompt = ai.definePrompt({
  name: 'generadorTitulosPrompt',
  input: { schema: GeneradorTitulosInputSchema },
  output: { schema: GeneradorTitulosOutputSchema },
  prompt: `Eres un ingeniero mecánico especializado en documentación técnica de procesos industriales.
Tu tarea es generar un título y un subtítulo muy profesionales para un reporte técnico basándose en el tema proporcionado.

El título debe ser:
- Formal y profesional
- Descriptivo pero conciso (máximo 10 palabras)
- Seguir convenciones de documentación técnica industrial

El subtítulo debe ser:
- Complementario al título
- Descriptivo del contenido específico
- Máximo 15 palabras

Tema: {{{tema}}}

Genera la respuesta estrictamente en el formato JSON especificado.`,
});

const generadorTitulosFlow = ai.defineFlow(
  {
    name: 'generadorTitulosFlow',
    inputSchema: GeneradorTitulosInputSchema,
    outputSchema: GeneradorTitulosOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await tituloPrompt(input);
      
      if (!output) {
        throw new Error('Genkit did not return a valid output.');
      }

      // Validate output schema
      const validated = GeneradorTitulosOutputSchema.parse(output);
      
      logger.debug('Flow executed successfully', 'generadorTitulosFlow');
      return validated;
    } catch (error) {
      logger.error(
        'Flow execution failed',
        error instanceof Error ? error : new Error(String(error)),
        'generadorTitulosFlow',
        { input }
      );
      throw error;
    }
  }
);
