'use client';

import { PageHeader } from "@/components/shared/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { leagues as trackedLeagues } from "@/lib/mock-data";
import { LeagueTable } from "@/components/league-status/league-table";
import { LeagueMatches } from "@/components/league-status/league-matches";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface StatusData {
  standings: any;
  matches: any[];
}

export default function LeagueStatusPage() {
  const [selectedLeague, setSelectedLeague] = useState<string>("PL");
  const [data, setData] = useState<StatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/league-status?leagueCode=${selectedLeague}`);
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch league data.');
        }
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedLeague]);

  const leagueName = trackedLeagues.find(l => l.id === 2021)?.name || "Premier League"; // Defaulting for display

  return (
    <div className="container mx-auto px-4 md:px-6">
      <PageHeader
        title="League Status"
        description="View live standings and upcoming matches for tracked leagues."
      />
      
      <div className="mb-6">
        <Select onValueChange={setSelectedLeague} defaultValue={selectedLeague}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a league" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PL">Premier League (İngiltere)</SelectItem>
            <SelectItem value="PD">La Liga (İspanya)</SelectItem>
            <SelectItem value="BL1">Bundesliga (Almanya)</SelectItem>
            <SelectItem value="SA">Serie A (İtalya)</SelectItem>
            <SelectItem value="FL1">Ligue 1 (Fransa)</SelectItem>
            <SelectItem value="CL">Champions League</SelectItem>
            <SelectItem value="DED">Eredivisie (Hollanda)</SelectItem>
            <SelectItem value="PPL">Primeira Liga (Portekiz)</SelectItem>
            <SelectItem value="ELC">Championship (İngiltere)</SelectItem>
            <SelectItem value="BSA">Brasileirão (Brezilya)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && data && (
        <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
                <LeagueTable standings={data.standings} />
            </div>
            <div className="lg:col-span-2">
                 <LeagueMatches matches={data.matches} />
            </div>
        </div>
      )}

    </div>
  );
}
