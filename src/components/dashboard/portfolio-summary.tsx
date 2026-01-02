"use client";

import { DollarSign, Percent, TrendingUp } from "lucide-react";
import { StatCard } from "../shared/stat-card";
import { portfolio } from "@/lib/mock-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-32 mt-2" />
      </CardContent>
    </Card>
  );
}

export function PortfolioSummary() {
  const [summaryData, setSummaryData] = useState<{
    totalProfit: number;
    roi: number;
    winRate: number;
    wins: number;
    totalBets: number;
  } | null>(null);

  useEffect(() => {
    // This calculation now only runs on the client-side after hydration
    const totalProfit = portfolio.reduce((acc, item) => acc + item.profit, 0);
    const totalStaked = portfolio.reduce((acc, item) => acc + item.staked, 0);
    const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
    const wins = portfolio.filter((item) => item.status === "Won").length;
    const totalBets = portfolio.length;
    const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;

    setSummaryData({
      totalProfit,
      roi,
      winRate,
      wins,
      totalBets,
    });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Portfolio Snapshot</CardTitle>
        <CardDescription>Your overall betting performance.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {!summaryData ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Total Profit"
                value={`$${summaryData.totalProfit.toFixed(2)}`}
                icon={DollarSign}
                description="Total net earnings"
              />
              <StatCard
                title="Return on Investment (ROI)"
                value={`${summaryData.roi.toFixed(2)}%`}
                icon={TrendingUp}
                description="Profit / Total Staked"
              />
              <StatCard
                title="Win Rate"
                value={`${summaryData.winRate.toFixed(2)}%`}
                icon={Percent}
                description={`${summaryData.wins} wins out of ${summaryData.totalBets} bets`}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
