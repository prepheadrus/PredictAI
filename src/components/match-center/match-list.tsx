
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import type { MatchWithTeams } from "@/lib/types";

interface MatchListProps {
  initialMatches: MatchWithTeams[];
}

export function MatchList({ initialMatches }: MatchListProps) {
  const [matches, setMatches] = useState(initialMatches);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsLoading(true);
    toast({
      title: "Data Refresh Started",
      description: "Fetching the latest matches for the 2025 season.",
    });
    try {
      const response = await fetch("/api/ingest?season=2025");
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch data.");
      }
      toast({
        title: "Refresh Complete",
        description: `${result.processed || 0} matches were ingested. The list will update shortly.`,
      });
      // Re-fetch or just reload for simplicity in this context
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error.message || "Could not refresh match data.",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
          />
          {isLoading ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Home Team</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Away Team</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.length > 0 ? (
              matches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell>
                    {match.match_date
                      ? format(new Date(match.match_date), "dd/MM/yyyy HH:mm")
                      : "N/A"}
                  </TableCell>
                  <TableCell>{match.homeTeam?.name ?? 'N/A'}</TableCell>
                  <TableCell>
                    {typeof match.home_score === "number" && typeof match.away_score === 'number'
                      ? `${match.home_score} - ${match.away_score}`
                      : "vs"}
                  </TableCell>
                  <TableCell>{match.awayTeam?.name ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-semibold",
                        match.status === "FT" ? "text-green-500" : "text-yellow-500"
                      )}
                    >
                      {match.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No matches found. Try refreshing the data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
