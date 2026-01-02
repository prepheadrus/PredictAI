"use client";

import { DollarSign, Percent, TrendingUp } from "lucide-react";
import { StatCard } from "../shared/stat-card";
import { portfolio } from "@/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

export function PortfolioSummary() {
  const totalProfit = portfolio.reduce((acc, item) => acc + item.profit, 0);
  const totalStaked = portfolio.reduce((acc, item) => acc + item.staked, 0);
  const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const wins = portfolio.filter(item => item.status === 'Won').length;
  const winRate = portfolio.length > 0 ? (wins / portfolio.length) * 100 : 0;

  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline">Portfolio Snapshot</CardTitle>
            <CardDescription>Your overall betting performance.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
            <StatCard
                title="Total Profit"
                value={`$${totalProfit.toFixed(2)}`}
                icon={DollarSign}
                description="Total net earnings"
            />
            <StatCard
                title="Return on Investment (ROI)"
                value={`${roi.toFixed(2)}%`}
                icon={TrendingUp}
                description="Profit / Total Staked"
            />
            <StatCard
                title="Win Rate"
                value={`${winRate.toFixed(2)}%`}
                icon={Percent}
                description={`${wins} wins out of ${portfolio.length} bets`}
            />
            </div>
        </CardContent>
    </Card>
  );
}