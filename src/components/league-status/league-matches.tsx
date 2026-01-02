import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";

interface LeagueMatchesProps {
  matches: any[];
}

export function LeagueMatches({ matches }: LeagueMatchesProps) {
  
  if (!matches || matches.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Upcoming Matches</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-10">
                    No scheduled matches found.
                </div>
            </CardContent>
        </Card>
    );
  }
  
  // Group matches by date
  const groupedMatches = matches.reduce((acc, match) => {
    const date = format(parseISO(match.utcDate), "EEEE, MMMM d, yyyy");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(match);
    return acc;
  }, {} as Record<string, any[]>);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Upcoming Matches</CardTitle>
        <CardDescription>Scheduled matches for the coming days.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-h-[600px] overflow-y-auto">
        {Object.entries(groupedMatches).map(([date, dayMatches]) => (
            <div key={date}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{date}</h3>
                <div className="space-y-4">
                {dayMatches.map((match: any) => (
                    <div key={match.id}>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-5 h-5 object-contain" />
                                <span className="truncate font-medium">{match.homeTeam.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground px-2 font-mono">
                                {format(parseISO(match.utcDate), "HH:mm")}
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                <span className="truncate font-medium text-right">{match.awayTeam.name}</span>
                                <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-5 h-5 object-contain" />
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}
