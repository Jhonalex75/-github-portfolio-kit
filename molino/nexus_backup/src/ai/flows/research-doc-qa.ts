
'use server';
/**
 * @fileOverview A Genkit flow for answering technical questions based on uploaded engineering standards/PDFs.
 *
 * - researchDocQA - A function that handles the document-based research process.
 * - ResearchDocQAInput - The input type for the researchDocQA function.
 * - ResearchDocQAOutput - The return type for the researchDocQA function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ResearchDocQAInputSchema = z.object({
  question: z.string().describe('The research question or request for information.'),
  pdfDataUris: z
    .array(z.string())
    .describe(
      "A collection of engineering standards or normative documents as base64 data URIs. Gemini will analyze these specifically."
    ),
});
export type ResearchDocQAInput = z.infer<typeof ResearchDocQAInputSchema>;

const ResearchDocQAOutputSchema = z.object({
  answer: z.string().describe('The comprehensive answer synthesized from the provided documents.'),
  sourcesFound: z.array(z.string()).describe('List of specific sections or documents where information was found.'),
});
export type ResearchDocQAOutput = z.infer<typeof ResearchDocQAOutputSchema>;

export async function researchDocQA(input: ResearchDocQAInput): Promise<ResearchDocQAOutput> {
  return researchDocQAFlow(input);
}

const prompt = ai.definePrompt({
  name: 'researchDocQAPrompt',
  input: {schema: ResearchDocQAInputSchema},
  output: {schema: ResearchDocQAOutputSchema},
  prompt: `You are an expert Engineering Consultant and Researcher. 
Your primary goal is to answer technical questions based strictly on the provided engineering standards or documents.

Research Question:
{{{question}}}

Provided Standards/Documents:
{{#each pdfDataUris}}
Document {{@index}}: {{media url=this}}
{{/each}}

Please analyze the provided documents to answer the question. 
- Ensure all claims are supported by the provided text.
- If the documents do not contain the answer, state that clearly but provide the best possible guidance based on standard engineering practices.
- Mention which document/norm was used for each part of the answer.`,
});

const researchDocQAFlow = ai.defineFlow(
  {
    name: 'researchDocQAFlow',
    inputSchema: ResearchDocQAInputSchema,
    outputSchema: ResearchDocQAOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Research QA prompt did not return a valid output.');
    }
    return output;
  }
);
