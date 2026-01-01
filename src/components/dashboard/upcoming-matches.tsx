import { MatchPredictionCard } from "./match-prediction-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { getUpcomingMatches } from "@/app/actions";

export async function UpcomingMatches() {
  const upcoming = await getUpcomingMatches();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Upcoming Predictions</CardTitle>
        <CardDescription>
          Analysis for the next set of matches.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upcoming.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((match) => (
              <MatchPredictionCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No upcoming matches found.</p>
            <p className="text-sm">Try refreshing the data in the Match Center.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
