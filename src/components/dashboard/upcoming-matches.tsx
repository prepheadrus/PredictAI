"use client";

import { MatchPredictionCard } from "./match-prediction-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { getUpcomingMatches } from "@/app/actions";
import type { MatchWithTeams } from "@/lib/types";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";

function UpcomingMatchesSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-around">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <Skeleton className="h-12 w-12 rounded-full" />
                        </div>
                         <Skeleton className="h-10 w-full" />
                    </CardContent>
                    <CardFooter>
                         <Skeleton className="h-10 w-full" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}


export function UpcomingMatches() {
  const [upcoming, setUpcoming] = useState<MatchWithTeams[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        const matches = await getUpcomingMatches();
        setUpcoming(matches);
      } catch (error) {
        console.error("Failed to fetch upcoming matches:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatches();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Upcoming Predictions</CardTitle>
        <CardDescription>
          Analysis for the next set of matches.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <UpcomingMatchesSkeleton />
        ) : upcoming.length > 0 ? (
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
