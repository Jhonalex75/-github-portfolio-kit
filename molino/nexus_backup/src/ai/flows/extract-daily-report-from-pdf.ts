'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { PHOTO_CATEGORIES, type PhotoCategory } from '@/lib/photo-categories';

// ─── Schema: per-contractor extraction (inlined to avoid $ref — Vertex AI requirement) ───
const contractorFields = () => ({
  activities:     z.string().describe('Narrative of field activities performed by this contractor.').optional(),
  mecanicos:      z.number().optional(),
  soldadores:     z.number().optional(),
  auxiliares:     z.number().optional(),
  armadores:      z.number().optional(),
  inspectoresHSE: z.number().optional(),
  grua:           z.number().optional(),
  generador:      z.number().optional(),
  andamios:       z.number().optional(),
  camionGrua:     z.number().optional(),
  torreGrua:      z.number().optional(),
  malClima:       z.number().optional().describe('Hours lost to bad weather.'),
  parosHSE:       z.number().optional().describe('Hours lost to HSE stoppages.'),
  fallasTecnicas: z.number().optional().describe('Hours lost to technical failures.'),
  charlaInfo:     z.number().optional().describe('Hours lost to safety talks or technical briefings.'),
  incidents:      z.number().optional(),
  nearMisses:     z.number().optional(),
  safetyComments: z.string().optional(),
  workAtHeights:  z.boolean().optional(),
  hotWork:        z.boolean().optional(),
  confinedSpace:  z.boolean().optional(),
  scaffolding:    z.boolean().optional(),
});

const ExtractDailyReportInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      'The PDF or image content as a data URI (e.g. data:application/pdf;base64,... or data:image/jpeg;base64,...). ' +
      'The model will read the document visually and extract all structured data.'
    ),
  reportDateHint: z.string().optional().describe('ISO date string hint in case the document does not state the date clearly.'),
});
export type ExtractDailyReportInput = z.infer<typeof ExtractDailyReportInputSchema>;

const ExtractedPhotoSchema = z.object({
  description: z.string().describe('Short description of what the photo shows.'),
  category:    z.string().describe('Best-fit category: Avance, Seguridad, Equipos, Incidentes, or General.'),
  pageIndex:   z.number().describe('Zero-based page index where the photo was found.'),
});

const ExtractDailyReportOutputSchema = z.object({
  reportDate: z.string().describe('Detected report date in ISO format YYYY-MM-DD. Empty string if not found.'),
  weather: z.string().describe('Detected weather condition (e.g. "Soleado ☀️"). Empty string if not found.'),
  frente: z.string().optional().describe('Work front / contractor name if identified.'),
  hlGisaico:    z.object(contractorFields()).optional().describe('Data extracted for contractor HL-GISAICO.'),
  tecnitanques: z.object(contractorFields()).optional().describe('Data extracted for contractor TECNITANQUES.'),
  cyc:          z.object(contractorFields()).optional().describe('Data extracted for contractor CYC.'),
  adminActivities: z
    .array(z.object({ name: z.string(), progress: z.number().min(0).max(100) }))
    .optional()
    .describe('Administrative activities with progress percentages.'),
  detectedPhotos: z
    .array(ExtractedPhotoSchema)
    .optional()
    .describe('Photos found embedded in the PDF, described and categorized.'),
  globalSafetyNotes: z.string().optional().describe('Any global safety notes or HSE observations.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Overall confidence score of the extraction (0.0 = very uncertain, 1.0 = very confident).'),
  rawSummary: z.string().describe('A short plain-text summary of what was found in the document.'),
});
export type ExtractDailyReportOutput = z.infer<typeof ExtractDailyReportOutputSchema>;

export async function extractDailyReportFromPdf(
  input: ExtractDailyReportInput
): Promise<ExtractDailyReportOutput> {
  return extractDailyReportFlow(input);
}

const PROMPT_BODY = `You are an expert industrial field-report analyst for ARIS MINING — MIL24.001 project (Lower Mining Project).
Your task is to extract ALL structured data from the provided document (PDF or photo of a handwritten/typed daily report).

CONTEXT:
- Project: ARIS MINING — MIL24.001
- Three possible contractors: HL-GISAICO (main, mechanical/civil), TECNITANQUES (tanks lixiviation), CYC (CIP tanks)
- Daily shift is 10 hours. Record LOST hours (malClima, parosHSE, fallasTecnicas, charlaInfo) in tenths.
- Personnel roles: mecanicos, soldadores, auxiliares, armadores, inspectoresHSE
- Equipment: grua, generador, andamios, camionGrua, torreGrua
- HSE permits: workAtHeights, hotWork, confinedSpace, scaffolding (true if mentioned as active)
- Photo categories to assign: Avance | Seguridad | Equipos | Incidentes | General
{{#if reportDateHint}}- Date hint provided: {{reportDateHint}}{{/if}}

INSTRUCTIONS:
1. Identify the report date (ISO YYYY-MM-DD). If ambiguous use the hint.
2. Identify weather conditions and map to one of: "Soleado ☀️", "Parcialmente Nublado ⛅", "Nublado ☁️", "Llovizna 🌦️", "Lluvia ☔", "Tormenta ⛈️".
3. Extract per-contractor data. If a contractor is not mentioned, omit its field.
4. For each detected photo or image in the document: describe it briefly and assign a category.
5. Extract admin activity names and progress percentages if found.
6. Set confidence: 0.9+ if data is typed/clear, 0.6–0.89 if handwritten but legible, below 0.6 if very unclear.
7. Write a short rawSummary of what you found.

Document to analyze:
{{media url=pdfDataUri}}`;

const extractPromptPrimary = ai.definePrompt({
  name: 'extractDailyReportPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: ExtractDailyReportInputSchema },
  output: { schema: ExtractDailyReportOutputSchema },
  prompt: PROMPT_BODY,
});

const isRetryableError = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const RETRY_DELAYS = [3000, 7000, 15000];

const extractDailyReportFlow = ai.defineFlow(
  {
    name: 'extractDailyReportFlow',
    inputSchema: ExtractDailyReportInputSchema,
    outputSchema: ExtractDailyReportOutputSchema,
  },
  async (input) => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        const { output } = await extractPromptPrimary(input);
        return output!;
      } catch (err) {
        lastErr = err;
        if (!isRetryableError(err) || attempt === RETRY_DELAYS.length) break;
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
    throw lastErr;
  }
);
