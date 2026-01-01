import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PortfolioItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface PortfolioTableProps {
  data: PortfolioItem[];
}

export function PortfolioTable({ data }: PortfolioTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Match</TableHead>
            <TableHead>League</TableHead>
            <TableHead>Bet On</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Image
                      src={item.homeTeam.logoUrl}
                      alt={item.homeTeam.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                      data-ai-hint="team logo"
                    />
                    <span className="font-medium">{item.homeTeam.name}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-medium">{item.awayTeam.name}</span>
                    <Image
                      src={item.awayTeam.logoUrl}
                      alt={item.awayTeam.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                      data-ai-hint="team logo"
                    />
                  </div>
                </TableCell>
                <TableCell>{item.league.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.betOn}</Badge>
                </TableCell>
                <TableCell className="text-right">{item.confidence}%</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-semibold",
                    item.profit > 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {item.profit.toFixed(2)}$
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={item.status === "Won" ? "default" : "destructive"}
                    className={cn(item.status === "Won" && "bg-green-600")}
                  >
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
