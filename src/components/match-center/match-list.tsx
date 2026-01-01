
"use client";

import { useState } from "react";
import { format as formatDate, toDate } from "date-fns-tz";
import { RefreshCw, Calendar, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { MatchWithTeams } from "@/lib/types";

// Veri Tipi Tanımlaması (API V4 Yapısına Uygun)
interface DisplayMatch {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
  };
  league: {
    name: string;
    logo: string | null;
  };
  teams: {
    home: { id: number | null; name: string; logo: string | null };
    away: { id: number | null; name: string; logo: string | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

const formatMatchData = (match: any): DisplayMatch => {
  const date = match.match_date || match.utcDate;
  const timeZone = 'Europe/London'; // Consistent timezone
  const formattedDate = date ? formatDate(toDate(date, { timeZone }), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { timeZone }) : new Date().toISOString();

  return {
    fixture: {
      id: match.id,
      date: formattedDate,
      status: { short: match.status },
    },
    league: {
      name: "Premier League", // This is mock data until we join leagues table
      logo: null,
    },
    teams: {
      home: {
        id: match.homeTeam?.id,
        name: match.homeTeam?.name || "Ev Sahibi",
        logo: match.homeTeam?.logoUrl || null,
      },
      away: {
        id: match.awayTeam?.id,
        name: match.awayTeam?.name || "Deplasman",
        logo: match.awayTeam?.logoUrl || null,
      },
    },
    goals: {
      home: match.home_score,
      away: match.away_score,
    },
  };
};


export function MatchList({ initialMatches }: { initialMatches: MatchWithTeams[] }) {
  const [data, setData] = useState<DisplayMatch[]>(initialMatches.map(formatMatchData) || []);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/ingest");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `API Hatası: ${response.status}`);
      }

      toast({
        title: "Güncelleme Başarılı",
        description: `${result.processed} adet maç işlendi. Sayfa yenileniyor...`,
      });
      
      // We are refreshing the page to get the latest data from the server
      window.location.reload();

    } catch (error: any) {
      console.error("Fetch Hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata Oluştu",
        description: error.message || "Veri çekilemedi.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Maç Geçmişi
        </h2>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Yükleniyor..." : "Veriyi Yenile"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.length === 0 ? (
          <div className="col-span-full text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-2">Gösterilecek maç bulunamadı.</p>
            <Button onClick={handleRefresh} variant="secondary">Verileri Getir</Button>
          </div>
        ) : (
          data.map((match) => (
            <Card key={match.fixture.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    {match.league.logo && <img src={match.league.logo} alt="lig" className="w-5 h-5 object-contain"/>}
                    <Badge variant="secondary" className="text-xs font-normal">
                      {match.league.name}
                    </Badge>
                  </div>
                  <span suppressHydrationWarning className="text-xs text-muted-foreground font-mono">
                    {match.fixture.date ? formatDate(toDate(match.fixture.date), "HH:mm", { timeZone: 'Europe/London' }) : 'TBD'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center gap-2">
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    {match.teams.home.logo ? (
                      <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-10 h-10 object-contain" />
                    ) : (<Trophy className="w-8 h-8 text-gray-200" />)}
                    <span className="text-xs font-bold text-center leading-tight line-clamp-2 w-full">{match.teams.home.name}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md min-w-[80px]">
                    <span className="text-xl font-black tracking-widest">
                      {match.goals.home ?? "-"} : {match.goals.away ?? "-"}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 uppercase">
                      {match.fixture.status.short}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    {match.teams.away.logo ? (
                      <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-10 h-10 object-contain" />
                    ) : (<Trophy className="w-8 h-8 text-gray-200" />)}
                    <span className="text-xs font-bold text-center leading-tight line-clamp-2 w-full">{match.teams.away.name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
