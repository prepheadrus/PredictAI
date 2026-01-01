import { matches } from "@/lib/mock-data";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamForm } from "@/components/analysis/team-form";
import { HeadToHead } from "@/components/analysis/head-to-head";
import { OddsAnalysis } from "@/components/analysis/odds-analysis";
import { PredictionExplanation } from "@/components/analysis/prediction-explanation";
import { Progress } from "@/components/ui/progress";
import { Calendar, Shield } from "lucide-react";

export default function MatchAnalysisPage({
  params,
}: {
  params: { matchId: string };
}) {
  const match = matches.find((m) => m.id.toString() === params.matchId);

  if (!match) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="flex items-center justify-center gap-4 md:gap-8 mb-4">
          <div className="flex flex-col items-center gap-2">
            <Image
              src={match.homeTeam.logoUrl}
              alt={match.homeTeam.name}
              width={80}
              height={80}
              className="rounded-full"
              data-ai-hint="team logo"
            />
            <h1 className="font-headline text-2xl md:text-3xl font-bold">
              {match.homeTeam.name}
            </h1>
          </div>
          <span className="text-4xl font-bold text-muted-foreground">VS</span>
          <div className="flex flex-col items-center gap-2">
            <Image
              src={match.awayTeam.logoUrl}
              alt={match.awayTeam.name}
              width={80}
              height={80}
              className="rounded-full"
              data-ai-hint="team logo"
            />
            <h1 className="font-headline text-2xl md:text-3xl font-bold">
              {match.awayTeam.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground text-sm">
             <span>{match.league.name}</span>
             <span className="text-xs">&bull;</span>
             <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(match.date).toLocaleDateString()}
             </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-3 bg-primary text-primary-foreground">
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">
              Prediction: {match.prediction} Win
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="w-full max-w-sm mx-auto">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-medium flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Confidence Level
                    </span>
                    <span className="font-bold text-lg">{match.confidence}%</span>
                </div>
                <Progress value={match.confidence} className="h-3 bg-primary-foreground/20 [&>div]:bg-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-3">
            <PredictionExplanation match={match} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Team Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TeamForm form={match.homeTeamForm} teamName={match.homeTeam.name} />
            <TeamForm form={match.awayTeamForm} teamName={match.awayTeam.name} />
          </CardContent>
        </Card>
        <HeadToHead matches={match.h2h} />
        <OddsAnalysis odds={match.odds} />
      </div>
    </div>
  );
}
