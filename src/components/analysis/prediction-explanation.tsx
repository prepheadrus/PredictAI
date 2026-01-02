"use client";

import { explainPrediction } from "@/ai/flows/explainable-predictions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useState } from "react";
import type { MatchWithTeams } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";
import { Wand2 } from "lucide-react";

interface PredictionExplanationProps {
  match: MatchWithTeams;
}

export function PredictionExplanation({ match }: PredictionExplanationProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    setIsLoading(true);
    setError(null);
    setExplanation(null);
    try {
      const matchDataString = `
        Teams: ${match.homeTeam?.name} vs ${match.awayTeam?.name}
        Odds: Home: ${match.home_odd}, Draw: ${match.draw_odd}, Away: ${match.away_odd}
        Analysis: Home Win: ${match.home_win_prob}%, Draw: ${match.draw_prob}%, Away Win: ${match.away_win_prob}%
      `;
      
      let predictedWinner = 'Draw';
        if (match.home_win_prob! > match.away_win_prob! && match.home_win_prob! > match.draw_prob!) {
            predictedWinner = match.homeTeam!.name!;
        } else if (match.away_win_prob! > match.home_win_prob! && match.away_win_prob! > match.draw_prob!) {
            predictedWinner = match.awayTeam!.name!;
        }

      const result = await explainPrediction({
        matchData: matchDataString,
        prediction: `The model predicts: ${predictedWinner} win with ${match.confidence}% confidence.`,
      });
      setExplanation(result.explanation);
    } catch (e) {
      setError("Failed to generate explanation. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-primary/5">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <Wand2 className="text-accent" />
            AI Prediction Breakdown
        </CardTitle>
        <CardDescription>
          Understand the 'why' behind the prediction with an AI-powered analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!explanation && !isLoading && (
            <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">Click the button to get a detailed explanation of the prediction factors.</p>
                <Button onClick={handleExplain} disabled={isLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Wand2 className="mr-2 h-4 w-4" />
                    Explain Prediction
                </Button>
            </div>
        )}
        
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {explanation && <p className="text-sm leading-relaxed">{explanation}</p>}
      </CardContent>
    </Card>
  );
}
