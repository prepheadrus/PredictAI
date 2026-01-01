import { matches } from "@/lib/mock-data";
import { MatchPredictionCard } from "./match-prediction-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

export function UpcomingMatches() {
  const upcoming = matches
    .filter((m) => new Date(m.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Upcoming Predictions</CardTitle>
        <CardDescription>
          Analysis for the next set of matches.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((match) => (
            <MatchPredictionCard key={match.id} match={match} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
