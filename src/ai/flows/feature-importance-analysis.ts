'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing feature importance in match outcome predictions.
 *
 * It provides:
 * - `analyzeFeatureImportance`: A function to trigger the feature importance analysis flow.
 * - `FeatureImportanceInput`: The input type for the `analyzeFeatureImportance` function.
 * - `FeatureImportanceOutput`: The output type for the `analyzeFeatureImportance` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FeatureImportanceInputSchema = z.object({
  matchDataDescription: z
    .string()
    .describe(
      'A detailed description of the match data, including team statistics, betting odds, and injury reports.'
    ),
  featureList: z
    .string()
    .describe('A comma-separated list of features used in the prediction model.'),
});
export type FeatureImportanceInput = z.infer<typeof FeatureImportanceInputSchema>;

const FeatureImportanceOutputSchema = z.object({
  featureImportanceAnalysis: z
    .string()
    .describe(
      'An analysis of which features have the biggest impact on the match outcome, with explanations for their predictive power.'
    ),
});
export type FeatureImportanceOutput = z.infer<typeof FeatureImportanceOutputSchema>;

export async function analyzeFeatureImportance(
  input: FeatureImportanceInput
): Promise<FeatureImportanceOutput> {
  return featureImportanceAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'featureImportancePrompt',
  input: {schema: FeatureImportanceInputSchema},
  output: {schema: FeatureImportanceOutputSchema},
  prompt: `You are an expert sports data scientist. Analyze the following match data and feature list to determine which features have the biggest impact on the match outcome. Provide clear explanations for the predictive power of each significant feature.

Match Data Description: {{{matchDataDescription}}}
Feature List: {{{featureList}}}

Analyze and explain the feature importance:
`,
});

const featureImportanceAnalysisFlow = ai.defineFlow(
  {
    name: 'featureImportanceAnalysisFlow',
    inputSchema: FeatureImportanceInputSchema,
    outputSchema: FeatureImportanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
