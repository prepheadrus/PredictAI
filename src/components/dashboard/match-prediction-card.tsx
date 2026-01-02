import type { MatchWithTeams } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Shield, Activity } from "lucide-react";
import { Progress } from "../ui/progress";

interface MatchPredictionCardProps {
  match: MatchWithTeams;
}

export function MatchPredictionCard({ match }: MatchPredictionCardProps) {
  const hasAnalysis = match.confidence !== null;
  const confidence = match.confidence || 0;

  let predictedWinner = 'Draw';
  if (hasAnalysis) {
      if (match.home_win_prob! > match.away_win_prob! && match.home_win_prob! > match.draw_prob!) {
          predictedWinner = match.homeTeam!.name!;
      } else if (match.away_win_prob! > match.home_win_prob! && match.away_win_prob! > match.draw_prob!) {
          predictedWinner = match.awayTeam!.name!;
      }
  }


  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-lg truncate" title={`${match.homeTeam?.name} vs ${match.awayTeam?.name}`}>
                    {match.homeTeam?.name} vs {match.awayTeam?.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    {match.match_date ? new Date(match.match_date).toLocaleString() : 'TBD'}
                </CardDescription>
            </div>
            <Badge variant={hasAnalysis ? 'default': 'outline'} className={hasAnalysis ? 'bg-green-600' : ''}>
                {hasAnalysis ? 'Analyzed' : 'Pending'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center justify-around text-center">
          <div className="flex flex-col items-center gap-2 w-1/3">
            <Image
              src={match.homeTeam?.logoUrl || '/placeholder.png'}
              alt={match.homeTeam?.name || 'Home Team'}
              width={48}
              height={48}
              className="rounded-full"
              data-ai-hint="team logo"
            />
            <span className="font-semibold truncate">{match.homeTeam?.name}</span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">VS</span>
          <div className="flex flex-col items-center gap-2 w-1/3">
            <Image
              src={match.awayTeam?.logoUrl || '/placeholder.png'}
              alt={match.awayTeam?.name || 'Away Team'}
              width={48}
              height={48}
              className="rounded-full"
              data-ai-hint="team logo"
            />
            <span className="font-semibold truncate">{match.awayTeam?.name}</span>
          </div>
        </div>
        
        {hasAnalysis ? (
            <div className="mt-6 space-y-4">
                 <div className="text-center">
                    <p className="text-sm text-muted-foreground">Predicted Winner</p>
                    <p className="font-bold text-primary truncate">{predictedWinner}</p>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-accent flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Confidence
                        </span>
                        <span className="text-sm font-bold text-accent">{confidence.toFixed(1)}%</span>
                    </div>
                    <Progress value={confidence} className="h-2 [&>div]:bg-accent" />
                </div>
            </div>
        ) : (
             <div className="mt-6 text-center text-muted-foreground">
                <Activity className="mx-auto w-8 h-8 mb-2"/>
                <p className="text-sm font-medium">Analysis Pending</p>
                <p className="text-xs">Run analysis from the Match Center.</p>
            </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" disabled={!hasAnalysis}>
          <Link href={`/analysis/${match.id}`}>
            View Full Analysis <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
