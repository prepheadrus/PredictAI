import type { Match } from "@/lib/types";
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
  match: Match;
}

export function MatchPredictionCard({ match }: MatchPredictionCardProps) {
  const confidenceColor =
    match.confidence > 75
      ? "bg-green-500"
      : match.confidence > 60
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-lg">{match.league.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(match.date).toLocaleString()}
                </CardDescription>
            </div>
            <Badge variant={match.prediction === 'Home' ? 'default' : match.prediction === 'Away' ? 'secondary' : 'outline'}>
                Prediction: {match.prediction}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center justify-around text-center">
          <div className="flex flex-col items-center gap-2">
            <Image
              src={match.homeTeam.logoUrl}
              alt={match.homeTeam.name}
              width={48}
              height={48}
              className="rounded-full"
              data-ai-hint="team logo"
            />
            <span className="font-semibold">{match.homeTeam.name}</span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">VS</span>
          <div className="flex flex-col items-center gap-2">
            <Image
              src={match.awayTeam.logoUrl}
              alt={match.awayTeam.name}
              width={48}
              height={48}
              className="rounded-full"
              data-ai-hint="team logo"
            />
            <span className="font-semibold">{match.awayTeam.name}</span>
          </div>
        </div>
        <div className="mt-6">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-primary flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Confidence
                </span>
                <span className="text-sm font-bold text-primary">{match.confidence}%</span>
            </div>
            <Progress value={match.confidence} className="h-2 [&>div]:bg-primary" />
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href={`/analysis/${match.id}`}>
            Full Analysis <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
