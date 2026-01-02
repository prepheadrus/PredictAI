import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface LeagueTableProps {
  standings: any;
}

export function LeagueTable({ standings }: LeagueTableProps) {
  const tableData = standings?.standings?.[0]?.table || [];

  return (
    <Card>
        <CardHeader>
            <CardTitle className="font-headline">{standings?.competition?.name} Standings</CardTitle>
            <CardDescription>
                Last updated: {standings?.filters?.season ? `Season ${standings.filters.season}`: new Date().toLocaleDateString()}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[50px]">Pos</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">MP</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">D</TableHead>
                <TableHead className="text-center">L</TableHead>
                <TableHead className="text-center">GD</TableHead>
                <TableHead className="text-center">Pts</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tableData.map((team: any) => (
                <TableRow key={team.team.id}>
                    <TableCell className="font-medium">{team.position}</TableCell>
                    <TableCell>
                    <div className="flex items-center gap-3">
                        <img src={team.team.crest} alt={team.team.name} className="w-6 h-6 object-contain" />
                        <span className="font-medium hidden sm:inline">{team.team.name}</span>
                        <span className="font-medium inline sm:hidden">{team.team.tla}</span>
                    </div>
                    </TableCell>
                    <TableCell className="text-center">{team.playedGames}</TableCell>
                    <TableCell className="text-center">{team.won}</TableCell>
                    <TableCell className="text-center">{team.draw}</TableCell>
                    <TableCell className="text-center">{team.lost}</TableCell>
                    <TableCell className="text-center">{team.goalDifference}</TableCell>
                    <TableCell className="text-center font-bold">{team.points}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}
