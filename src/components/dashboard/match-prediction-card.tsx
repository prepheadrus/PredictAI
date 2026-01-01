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
import { ArrowRight, Calendar, Shield } from "lucide-react";
import { Progress } from "../ui/progress";

interface MatchPredictionCardProps {
  match: MatchWithTeams;
}

export function MatchPredictionCard({ match }: MatchPredictionCardProps) {
  // Mock prediction data as it's not in the DB yet
  const prediction = "Home";
  const confidence = Math.floor(Math.random() * 51) + 50; // Random confidence 50-100

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-lg truncate">
                    {match.homeTeam?.name} vs {match.awayTeam?.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    {match.match_date ? new Date(match.match_date).toLocaleString() : 'TBD'}
                </CardDescription>
            </div>
            <Badge variant={'outline'}>
                Analysis Pending
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
        <div className="mt-6">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-primary flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Confidence
                </span>
                <span className="text-sm font-bold text-primary">--%</span>
            </div>
            <Progress value={0} className="h-2" />
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled>
          <Link href={`#`}>
            Analysis Pending <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
