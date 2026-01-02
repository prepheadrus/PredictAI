
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
import { HomeAdvantageChart } from "@/components/league-status/home-advantage-chart";

interface StatusData {
  standings: any;
  matches: any[];
}

interface HistoricalData {
    season: string;
    "Home Win %": number;
}

export default function LeagueStatusPage() {
  const [selectedLeague, setSelectedLeague] = useState<string>("PL");
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setIsHistoryLoading(true);
      setError(null);
      
      try {
        // Fetch both data points in parallel
        const [statusResponse, historyResponse] = await Promise.all([
             fetch(`/api/league-status?leagueCode=${selectedLeague}`),
             fetch(`/api/historical-stats?leagueCode=${selectedLeague}`)
        ]);

        const statusResult = await statusResponse.json();
        if (!statusResponse.ok) {
          throw new Error(statusResult.error || 'Failed to fetch league data.');
        }
        setStatusData(statusResult);
        setIsLoading(false);

        if(historyResponse.ok) {
            const historyResult = await historyResponse.json();
            setHistoricalData(historyResult);
        } else {
            console.warn("Could not fetch historical data.");
            setHistoricalData([]); // Reset on failure
        }
        setIsHistoryLoading(false);

      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
        setIsHistoryLoading(false);
      }
    };

    fetchData();
  }, [selectedLeague]);

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

      {error && (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
              {isLoading ? (
                  <Card>
                      <CardHeader>
                          <Skeleton className="h-6 w-1/2" />
                          <Skeleton className="h-4 w-3/4 mt-2" />
                      </CardHeader>
                      <CardContent>
                          <Skeleton className="h-64 w-full" />
                      </CardContent>
                  </Card>
              ) : statusData && (
                  <LeagueTable standings={statusData.standings} />
              )}
               <HomeAdvantageChart data={historicalData} isLoading={isHistoryLoading} />
          </div>
          <div className="lg:col-span-2">
               {isLoading ? (
                  <Card>
                      <CardHeader>
                          <Skeleton className="h-6 w-1/2" />
                          <Skeleton className="h-4 w-3/4 mt-2" />
                      </CardHeader>
                      <CardContent>
                          <Skeleton className="h-80 w-full" />
                      </CardContent>
                  </Card>
               ): statusData && (
                  <LeagueMatches matches={statusData.matches} />
               )}
          </div>
      </div>
    </div>
  );
}
