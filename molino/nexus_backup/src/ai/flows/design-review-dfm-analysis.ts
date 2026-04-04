
'use server';
/**
 * @fileOverview A Genkit flow for analyzing engineering documentation (images or PDFs) for Design for Manufacturability (DFM) issues.
 *
 * - dfmAnalysis - A function that handles the DFM analysis process.
 * - DFMAnalysisInput - The input type for the dfmAnalysis function.
 * - DFMAnalysisOutput - The return type for the dfmAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const DFMAnalysisInputSchema = z.object({
  drawingDataUri: z
    .string()
    .describe(
      "An engineering drawing or technical PDF, as a data URI that must include a MIME type and use Base64 encoding. Expected formats: 'data:image/jpeg;base64,...' or 'data:application/pdf;base64,...'."
    ),
  standardsOrChecklist: z
    .string()
    .optional()
    .describe(
      'Optional. Specific engineering standards or a custom checklist to evaluate the drawing against. If provided, the AI should prioritize these guidelines.'
    ),
});
export type DFMAnalysisInput = z.infer<typeof DFMAnalysisInputSchema>;

// Output Schema
const DFMAnalysisIssueSchema = z.object({
  description: z.string().describe('A detailed description of the identified DFM issue.'),
  category:
    z.enum(['Tolerancing', 'Material', 'Assembly', 'Process', 'Cost', 'Design', 'Other']).describe('The category of the DFM issue.'),
  severity:
    z.enum(['Critical', 'Major', 'Minor', 'Suggestion']).describe('The severity level of the DFM issue.'),
  suggestion: z.string().describe('A suggested improvement or solution for the issue.'),
});

const DFMAnalysisOutputSchema = z.object({
  hasIssues: z.boolean().describe('True if any DFM issues were identified, false otherwise.'),
  issues: z.array(DFMAnalysisIssueSchema).describe('A list of identified DFM issues.'),
  summary:
    z.string().describe('A general summary of the DFM analysis findings and overall manufacturability of the design.'),
});
export type DFMAnalysisOutput = z.infer<typeof DFMAnalysisOutputSchema>;

export async function dfmAnalysis(input: DFMAnalysisInput): Promise<DFMAnalysisOutput> {
  return dfmAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dfmAnalysisPrompt',
  input: {schema: DFMAnalysisInputSchema},
  output: {schema: DFMAnalysisOutputSchema},
  prompt: `You are an expert Design for Manufacturability (DFM) engineer and Lead Technical Reviewer. 
Your task is to analyze an engineering document (which could be a drawing image or a PDF technical document) to identify potential DFM issues and technical non-compliance.

Carefully examine the provided asset: {{media url=drawingDataUri}}

{{#if standardsOrChecklist}}
Additionally, evaluate the design against the following specific standards or requirements:
{{{standardsOrChecklist}}}
{{/if}}

Identify common DFM issues such as:
1. Problematic tolerances (too tight for the process).
2. Unsuitable materials for the specified design or environment.
3. Difficult assembly steps (interference, lack of access).
4. High manufacturing costs due to unnecessary precision or complexity.
5. Complex geometries that are difficult to machine or cast.

For each issue identified, provide:
- A clear description of the finding.
- The most relevant category.
- A severity level (Critical: must fix, Major: should fix, Minor/Suggestion: improvement).
- A concrete, actionable suggestion for improvement.

Finally, provide an overall technical summary of the design's manufacturability.`,
});

const dfmAnalysisFlow = ai.defineFlow(
  {
    name: 'dfmAnalysisFlow',
    inputSchema: DFMAnalysisInputSchema,
    outputSchema: DFMAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('DFM analysis prompt did not return a valid output.');
    }
    return output;
  }
);
