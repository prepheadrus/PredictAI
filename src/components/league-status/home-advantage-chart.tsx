
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { Skeleton } from '../ui/skeleton';

interface HomeAdvantageChartProps {
  data: { season: string; "Home Win %": number }[];
  isLoading: boolean;
}

const chartConfig = {
  "Home Win %": {
    label: "Home Win %",
    color: "hsl(var(--chart-1))",
  },
};

export function HomeAdvantageChart({ data, isLoading }: HomeAdvantageChartProps) {
  if (isLoading) {
      return (
          <Card>
              <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                  <Skeleton className="h-48 w-full" />
              </CardContent>
          </Card>
      );
  }

  if (!data || data.length === 0) {
      return null; // Don't render the card if there's no data
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Home Advantage Trend</CardTitle>
        <CardDescription>Home team win percentage over past seasons.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
            <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="season"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                />
                <YAxis 
                    unit="%"
                    domain={[30, 60]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                />
                 <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="Home Win %" fill="var(--color-Home Win %)" radius={4} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
