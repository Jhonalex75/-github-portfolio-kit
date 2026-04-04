'use server';
/**
 * @fileOverview A Genkit flow for moderating chat messages in the CyberEngineer Nexus communication hub.
 *
 * - chatContentModeration - A function that handles the content moderation process.
 * - ChatContentModerationInput - The input type for the chatContentModeration function.
 * - ChatContentModerationOutput - The return type for the chatContentModeration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatContentModerationInputSchema = z.object({
  message: z.string().describe('The chat message to be moderated.'),
});
export type ChatContentModerationInput = z.infer<typeof ChatContentModerationInputSchema>;

const ChatContentModerationOutputSchema = z.object({
  isAppropriate: z
    .boolean()
    .describe(
      'True if the message is professional and on-topic for engineering discussions, false otherwise.'
    ),
  reason: z
    .string()
    .describe(
      'An explanation of why the message is not appropriate, if isAppropriate is false. Empty string if appropriate.'
    ),
});
export type ChatContentModerationOutput = z.infer<typeof ChatContentModerationOutputSchema>;

export async function chatContentModeration(
  input: ChatContentModerationInput
): Promise<ChatContentModerationOutput> {
  return chatContentModerationFlow(input);
}

const moderationPrompt = ai.definePrompt({
  name: 'chatContentModerationPrompt',
  input: {schema: ChatContentModerationInputSchema},
  output: {schema: ChatContentModerationOutputSchema},
  prompt: `You are an AI moderator for a professional engineering communication hub.
Your task is to analyze chat messages and determine if they are professional and strictly on-topic for engineering discussions. The discussions should be focused on technical engineering matters.

-   **Professionalism**: Maintain a respectful and professional tone. Avoid slang, informal language, personal remarks, or any content that could be considered unprofessional.
-   **On-Topic**: Messages must be directly related to engineering topics, project work, technical specifications, or relevant scientific principles. Off-topic content includes, but is not limited to, general chat, personal anecdotes, non-work-related humor, or unrelated news.

Analyze the following message and determine if it meets these criteria.

Message: {{{message}}}

Provide your analysis in the specified JSON format.
If the message is inappropriate, clearly state the reason (e.g., "Off-topic: discussed personal weekend plans", "Unprofessional: used disrespectful language").`,
});

const chatContentModerationFlow = ai.defineFlow(
  {
    name: 'chatContentModerationFlow',
    inputSchema: ChatContentModerationInputSchema,
    outputSchema: ChatContentModerationOutputSchema,
  },
  async input => {
    const {output} = await moderationPrompt(input);
    return output!;
  }
);
