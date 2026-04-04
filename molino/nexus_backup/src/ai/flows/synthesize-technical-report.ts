'use server';
/**
 * @fileOverview A Genkit flow for synthesizing comprehensive technical reports from a research question and reference documents.
 *
 * - synthesizeTechnicalReport - A function that handles the report synthesis process.
 * - SynthesizeTechnicalReportInput - The input type for the synthesizeTechnicalReport function.
 * - SynthesizeTechnicalReportOutput - The return type for the synthesizeTechnicalReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SynthesizeTechnicalReportInputSchema = z.object({
  researchQuestion: z.string().describe('The specific research question to address in the report.'),
  referenceDocuments: z.array(z.string()).describe('A collection of reference documents (e.g., academic papers, articles) to use for synthesizing the report. Each document should be a string containing its full content.'),
});
export type SynthesizeTechnicalReportInput = z.infer<typeof SynthesizeTechnicalReportInputSchema>;

const SynthesizeTechnicalReportOutputSchema = z.object({
  technicalReport: z.string().describe('The comprehensive technical report with accurate citations.'),
});
export type SynthesizeTechnicalReportOutput = z.infer<typeof SynthesizeTechnicalReportOutputSchema>;

export async function synthesizeTechnicalReport(input: SynthesizeTechnicalReportInput): Promise<SynthesizeTechnicalReportOutput> {
  return synthesizeTechnicalReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'synthesizeTechnicalReportPrompt',
  input: { schema: SynthesizeTechnicalReportInputSchema },
  output: { schema: SynthesizeTechnicalReportOutputSchema },
  prompt: `You are an expert research assistant. Your task is to synthesize a comprehensive technical report based on the provided research question and reference documents.
Ensure all information is accurate and directly supported by the reference documents.
Include citations for all factual claims, referencing the documents by their numerical index (e.g., "[Document 0]", "[Document 1]").

Research Question:
{{{researchQuestion}}}

Reference Documents:
{{#each referenceDocuments}}
--- Reference Document {{@index}} ---
{{{this}}}
---
{{/each}}

Please provide the comprehensive technical report:`,
});

const synthesizeTechnicalReportFlow = ai.defineFlow(
  {
    name: 'synthesizeTechnicalReportFlow',
    inputSchema: SynthesizeTechnicalReportInputSchema,
    outputSchema: SynthesizeTechnicalReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
