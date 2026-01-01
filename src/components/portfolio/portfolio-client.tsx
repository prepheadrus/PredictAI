"use client";

import { useState, useMemo } from "react";
import { leagues, portfolio } from "@/lib/mock-data";
import { PortfolioCharts } from "./portfolio-charts";
import { PortfolioTable } from "./portfolio-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function PortfolioClient() {
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredData = useMemo(() => {
    return portfolio.filter((item) => {
      const leagueMatch =
        leagueFilter === "all" || item.league.id.toString() === leagueFilter;
      const statusMatch =
        statusFilter === "all" || item.status.toLowerCase() === statusFilter;
      const confidenceMatch =
        confidenceFilter === "all" ||
        (confidenceFilter === "low" && item.confidence < 60) ||
        (confidenceFilter === "medium" &&
          item.confidence >= 60 &&
          item.confidence <= 80) ||
        (confidenceFilter === "high" && item.confidence > 80);
      return leagueMatch && statusMatch && confidenceMatch;
    });
  }, [leagueFilter, confidenceFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <PortfolioCharts data={filteredData} />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Prediction History</CardTitle>
          <CardDescription>A detailed log of all your past predictions and their outcomes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="grid gap-2 w-full md:w-auto">
                    <Label htmlFor="league-filter">League</Label>
                    <Select value={leagueFilter} onValueChange={setLeagueFilter}>
                        <SelectTrigger id="league-filter" className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filter by league" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Leagues</SelectItem>
                            {leagues.map((league) => (
                                <SelectItem key={league.id} value={league.id.toString()}>
                                    {league.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2 w-full md:w-auto">
                    <Label htmlFor="confidence-filter">Confidence</Label>
                    <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                        <SelectTrigger id="confidence-filter" className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filter by confidence" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="high">High (&gt;80%)</SelectItem>
                            <SelectItem value="medium">Medium (60-80%)</SelectItem>
                            <SelectItem value="low">Low (&lt;60%)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2 w-full md:w-auto">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="status-filter" className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <PortfolioTable data={filteredData} />
        </CardContent>
      </Card>
    </div>
  );
}
