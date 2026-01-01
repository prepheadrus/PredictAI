'use server';

/**
 * @fileOverview Explains the factors influencing a prediction.
 *
 * - explainPrediction - A function that provides explanations for a given prediction.
 * - ExplainPredictionInput - The input type for the explainPrediction function.
 * - ExplainPredictionOutput - The return type for the explainPrediction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainPredictionInputSchema = z.object({
  matchData: z.string().describe('Data about the match, including team stats, odds, and injury reports.'),
  prediction: z.string().describe('The predicted outcome of the match.'),
});
export type ExplainPredictionInput = z.infer<typeof ExplainPredictionInputSchema>;

const ExplainPredictionOutputSchema = z.object({
  explanation: z.string().describe('An explanation of why the model predicted this outcome.'),
});
export type ExplainPredictionOutput = z.infer<typeof ExplainPredictionOutputSchema>;

export async function explainPrediction(input: ExplainPredictionInput): Promise<ExplainPredictionOutput> {
  return explainPredictionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainPredictionPrompt',
  input: {schema: ExplainPredictionInputSchema},
  output: {schema: ExplainPredictionOutputSchema},
  prompt: `You are an expert sports analyst explaining a machine learning model's prediction for a soccer match.

  Based on the provided match data and the model's prediction, explain the key factors that led to this prediction. Consider team statistics, betting odds, injury reports, and any other relevant information.

  Match Data: {{{matchData}}}
  Prediction: {{{prediction}}}

  Explanation:`,
});

const explainPredictionFlow = ai.defineFlow(
  {
    name: 'explainPredictionFlow',
    inputSchema: ExplainPredictionInputSchema,
    outputSchema: ExplainPredictionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
