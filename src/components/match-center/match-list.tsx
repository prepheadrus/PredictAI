'use client';

import { useState } from "react";
import { format } from "date-fns";
import { RefreshCw, Calendar, Trophy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// KULLANICININ GERÇEK API ANAHTARI
const API_KEY = "a938377027ec4af3bba0ae5a3ba19064"; 

interface Match {
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
    home: { id: number; name: string; logo: string | null };
    away: { id: number; name: string; logo: string | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

export function MatchList() {
  const [data, setData] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      // Gelecek 3 günü tarayalım ki kesin maç bulalım
      const endDate = new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0];

      // KULLANICININ HESABINDA AKTİF OLAN LİGLER
      // PL: İngiltere, PD: İspanya, SA: İtalya, BL1: Almanya, FL1: Fransa, CL: Şampiyonlar Ligi, DED: Hollanda, PPL: Portekiz
      const competitions = "PL,PD,SA,BL1,FL1,CL,DED,PPL";
      
      const url = `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${endDate}&competitions=${competitions}`;

      console.log("Fetching URL:", url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Auth-Token': API_KEY,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // API Limiti (429) veya Yetki (403) hatası kontrolü
        throw new Error(result.message || `Hata Kodu: ${response.status}`);
      }

      if (!result.matches || !Array.isArray(result.matches)) {
        console.warn("Veri formatı beklenmedik:", result);
        setData([]);
        toast({ title: "Bilgi", description: "Bu tarih aralığında seçili liglerde maç yok." });
        return;
      }

      const formattedData = result.matches.map((match: any) => ({
        fixture: {
          id: match.id,
          date: match.utcDate,
          status: { short: match.status }
        },
        league: {
          name: match.competition?.name || "Lig",
          logo: match.competition?.emblem || null
        },
        teams: {
          home: {
            id: match.homeTeam?.id,
            name: match.homeTeam?.name || "Ev Sahibi",
            logo: match.homeTeam?.crest || null
          },
          away: {
            id: match.awayTeam?.id,
            name: match.awayTeam?.name || "Deplasman",
            logo: match.awayTeam?.crest || null
          }
        },
        goals: {
          home: match.score?.fullTime?.home ?? null,
          away: match.score?.fullTime?.away ?? null
        }
      }));

      setData(formattedData);
      
      toast({
        title: "Fikstür Güncellendi",
        description: `${formattedData.length} maç başarıyla çekildi.`,
      });

    } catch (error: any) {
      console.error("API Hatası:", error);
      toast({
        variant: "destructive",
        title: "Veri Çekilemedi",
        description: error.message || "Lütfen internet bağlantınızı kontrol edin.",
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
          Güncel Fikstür
        </h2>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Yenile" : "Yenile"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.length === 0 ? (
          <div className="col-span-full text-center py-10 border-2 border-dashed rounded-lg bg-muted/50">
            <p className="text-muted-foreground font-medium">Henüz maç verisi yüklenmedi.</p>
            <p className="text-xs text-muted-foreground mt-1">Yenile butonuna basarak verileri çekebilirsiniz.</p>
          </div>
        ) : (
          data.map((match) => (
            <Card key={match.fixture.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    {match.league.logo && <img src={match.league.logo} alt="lig" className="w-5 h-5 object-contain"/>}
                    <Badge variant="secondary" className="text-[10px] font-normal px-1.5 h-5">
                      {match.league.name}
                    </Badge>
                  </div>
                  {/* SAAT FARKI HATASI İÇİN FIX */}
                  <span suppressHydrationWarning className="text-xs text-muted-foreground font-mono">
                    {match.fixture.date ? format(new Date(match.fixture.date), "HH:mm") : '-'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center gap-2">
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    {match.teams.home.logo ? (
                      <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
                    ) : (<Trophy className="w-8 h-8 text-gray-200" />)}
                    <span className="text-xs font-bold text-center leading-tight line-clamp-2 w-full">{match.teams.home.name}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md min-w-[70px]">
                    <span className="text-lg font-black tracking-widest">
                      {match.goals.home ?? "-"} : {match.goals.away ?? "-"}
                    </span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">
                      {match.fixture.status.short}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    {match.teams.away.logo ? (
                      <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
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
