"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Scatter,
  ScatterChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PortfolioItem } from "@/lib/types";
import { useMemo } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "../ui/chart";

interface PortfolioChartsProps {
  data: PortfolioItem[];
}

export function PortfolioCharts({ data }: PortfolioChartsProps) {
  const monthlySuccessData = useMemo(() => {
    const months: { [key: string]: { total: number; wins: number } } = {};
    data.forEach((item) => {
      const month = new Date(item.date).toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });
      if (!months[month]) {
        months[month] = { total: 0, wins: 0 };
      }
      months[month].total++;
      if (item.status === "Won") {
        months[month].wins++;
      }
    });
    return Object.entries(months).map(([name, { total, wins }]) => ({
      name,
      "Success Rate": total > 0 ? (wins / total) * 100 : 0,
    })).reverse();
  }, [data]);

  const leagueProfitData = useMemo(() => {
    const leagues: { [key: string]: number } = {};
    data.forEach((item) => {
      if (!leagues[item.league.name]) {
        leagues[item.league.name] = 0;
      }
      leagues[item.league.name] += item.profit;
    });
    return Object.entries(leagues).map(([name, profit]) => ({ name, profit }));
  }, [data]);

  const roiVsConfidenceData = useMemo(() => {
    return data.map((item) => ({
      confidence: item.confidence,
      roi: (item.profit / item.staked) * 100,
      status: item.status,
    }));
  }, [data]);

  const chartConfig = {
      profit: {
        label: "Profit",
        color: "hsl(var(--chart-1))",
      },
      "Success Rate": {
        label: "Success Rate",
        color: "hsl(var(--chart-2))",
      },
  }

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Monthly Success Rate</CardTitle>
          <CardDescription>Win percentage over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={monthlySuccessData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis unit="%" />
              <Tooltip
                content={<ChartTooltipContent indicator="line" />}
              />
              <Legend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="Success Rate" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Profit/Loss by League</CardTitle>
          <CardDescription>Performance across different leagues.</CardDescription>
        </CardHeader>
        <CardContent>
           <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={leagueProfitData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis unit="$" />
              <Tooltip
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Legend content={<ChartLegendContent />} />
              <Bar dataKey="profit" radius={4}>
                {leagueProfitData.map((entry, index) => (
                  <rect key={`cell-${index}`} fill={entry.profit >= 0 ? "hsl(var(--chart-1))" : "hsl(var(--destructive))"} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
