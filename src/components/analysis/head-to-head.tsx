import type { Match } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

interface HeadToHeadProps {
  matches: Match[];
}

export function HeadToHead({ matches }: HeadToHeadProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Head-to-Head</CardTitle>
        <CardDescription>Recent encounters between the two teams.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          <div className="space-y-4">
            {matches.map((match, index) => (
              <div key={match.id}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex-1 text-left">
                    <span>{match.homeTeam.name}</span>
                  </div>
                  <div className="font-bold px-4">
                    {match.result?.homeScore} - {match.result?.awayScore}
                  </div>
                  <div className="flex-1 text-right">
                    <span>{match.awayTeam.name}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {new Date(match.date).toLocaleDateString()}
                </p>
                {index < matches.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
