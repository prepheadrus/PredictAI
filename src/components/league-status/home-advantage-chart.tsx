
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
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
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                />
                 <Tooltip
                    cursor={true}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Line 
                    dataKey="Home Win %" 
                    stroke="var(--color-Home Win %)" 
                    strokeWidth={2}
                    dot={{
                        r: 4,
                        fill: "var(--color-Home Win %)",
                        opacity: 1
                    }}
                />
            </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
