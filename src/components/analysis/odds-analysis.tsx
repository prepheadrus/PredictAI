import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface OddsAnalysisProps {
  odds: {
    home: number;
    draw: number;
    away: number;
  };
}

export function OddsAnalysis({ odds }: OddsAnalysisProps) {
  const impliedProbability = (odd: number) => (1 / odd * 100).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Odds Analysis</CardTitle>
        <CardDescription>Bookmaker odds and implied probabilities.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Home Win</p>
            <p className="text-2xl font-bold text-primary">{odds.home.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{impliedProbability(odds.home)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Draw</p>
            <p className="text-2xl font-bold text-primary">{odds.draw.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{impliedProbability(odds.draw)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Away Win</p>
            <p className="text-2xl font-bold text-primary">{odds.away.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{impliedProbability(odds.away)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
