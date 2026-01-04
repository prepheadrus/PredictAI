
'use client';

import { useState, useMemo, useEffect, useCallback, useTransition } from "react";
import { format } from "date-fns";
import { RefreshCw, Clock, ArrowDownUp, Zap, Percent, Target, BrainCircuit, Bot, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "../ui/progress";
import { cn } from "@/lib/utils";
import { TeamForm, type FormResult } from "../analysis/team-form";
import { getMatchesWithTeams, refreshAndAnalyzeMatches } from "@/app/actions";
import type { MatchWithTeams } from "@/lib/types";


export function MatchList({ initialMatches }: { initialMatches: MatchWithTeams[] }) {
  const [data, setData] = useState<MatchWithTeams[]>(initialMatches);
  const [isPending, startTransition] = useTransition(); // For Server Action loading state
  const [isAnalyzing, setIsAnalyzing] = useState<Record<number, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchWithTeams | null>(null);
  const [selectedMatchAnalysis, setSelectedMatchAnalysis] = useState<any | null>(null);
  const [sortKey, setSortKey] = useState<"date" | "confidence">("date");
  const { toast } = useToast();
  
  const [homeTeamForm, setHomeTeamForm] = useState<FormResult[] | null>(null);
  const [awayTeamForm, setAwayTeamForm] = useState<FormResult[] | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  
  // This will run whenever the initialMatches prop changes (e.g., after revalidation)
  useEffect(() => {
    setData(initialMatches);
  }, [initialMatches]);


  const handleRefreshAndAnalyze = () => {
    startTransition(async () => {
        toast({ title: "Fikstür Yenileniyor...", description: "Yeni maçlar için API kontrol ediliyor ve analizler başlatılıyor." });
        const result = await refreshAndAnalyzeMatches();
        if (result.success) {
            toast({ title: "İşlem Tamamlandı!", description: result.message });
        } else {
            toast({ variant: "destructive", title: "İşlem Başarısız", description: result.message });
        }
        // The page will be revalidated by the server action, which will update the `initialMatches` prop
    });
  };
  
  const handleCardClick = async (match: MatchWithTeams) => {
    if (match.confidence === null) {
        toast({
            variant: "destructive",
            title: "Analiz Verisi Eksik",
            description: "Bu maç henüz analiz edilmemiş. Lütfen önce analiz işlemini çalıştırın.",
        });
        return;
    }
    setSelectedMatch(match);
    setIsModalOpen(true);
    setIsFormLoading(true);
    setHomeTeamForm(null);
    setAwayTeamForm(null);
    setSelectedMatchAnalysis(null);

    try {
        const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:9002';
        const response = await fetch(`${host}/api/ai-predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                homeTeam: match.homeTeam!.name,
                awayTeam: match.awayTeam!.name,
                homeId: match.home_team_id,
                awayId: match.away_team_id,
                league: "Unknown League",
            }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setSelectedMatchAnalysis(result);

    } catch (error) {
         console.error("Failed to fetch full analysis", error);
         toast({ variant: "destructive", title: "Hata", description: "Analiz yorumu çekilemedi."});
    }

    if (!match.home_team_id || !match.away_team_id) return;

    try {
        const [homeFormRes, awayFormRes] = await Promise.all([
            fetch(`/api/team-form?teamId=${match.home_team_id}`),
            fetch(`/api/team-form?teamId=${match.away_team_id}`)
        ]);

        if (homeFormRes.ok) setHomeTeamForm(await homeFormRes.json());
        if (awayFormRes.ok) setAwayTeamForm(await awayFormRes.json());

    } catch (error) {
        console.error("Failed to fetch team forms", error);
    } finally {
        setIsFormLoading(false);
    }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortKey === 'confidence') {
        return (b.confidence || 0) - (a.confidence || 0);
      }
      // Ensure match_date is not null before comparing
      const dateA = a.match_date ? new Date(a.match_date).getTime() : 0;
      const dateB = b.match_date ? new Date(b.match_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [data, sortKey]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Sırala:</p>
                 <Button onClick={() => setSortKey('date')} variant={sortKey === 'date' ? 'default' : 'outline'} size="sm">
                    <Clock className="w-4 h-4 mr-2" />
                    Tarihe Göre
                </Button>
                <Button onClick={() => setSortKey('confidence')} variant={sortKey === 'confidence' ? 'default' : 'outline'} size="sm">
                    <ArrowDownUp className="w-4 h-4 mr-2" />
                    Güven Skoruna Göre
                </Button>
            </div>
            <Button onClick={handleRefreshAndAnalyze} disabled={isPending} className="w-full sm:w-auto">
              <RefreshCw className={`w-4 h-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
              {isPending ? "İşlem Devam Ediyor..." : "Fikstürü Yenile ve Analiz Et"}
            </Button>
        </CardContent>
      </Card>
      

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedData.length === 0 ? (
          <div className="col-span-full text-center py-10 border-2 border-dashed rounded-lg bg-muted/50">
            <p className="text-muted-foreground font-medium">Veritabanında hiç maç bulunamadı.</p>
            <p className="text-xs text-muted-foreground mt-1">Başlamak için fikstürü yenileyin ve verileri çekin.</p>
          </div>
        ) : (
          sortedData.map((match) => (
            <Card key={match.id} onClick={() => handleCardClick(match)} className={cn("hover:shadow-md transition-shadow cursor-pointer group flex flex-col", match.confidence === null && "opacity-60")}>
              <CardContent className="p-4 flex-grow flex flex-col">
                 <div className="flex justify-between items-start mb-2 pb-2 border-b">
                  <div className="flex items-center gap-2">
                     <Badge variant="secondary" className="text-[10px] font-normal px-1.5 h-5">{match.status}</Badge>
                  </div>
                   <span suppressHydrationWarning className="text-xs text-muted-foreground font-mono">
                    {match.match_date ? format(new Date(match.match_date), "dd.MM HH:mm") : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2 mb-4">
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    <img src={match.homeTeam?.logoUrl || ''} alt={match.homeTeam?.name || ''} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-center leading-tight line-clamp-2 w-full">{match.homeTeam?.name}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center min-w-[70px]">
                    <span className="text-lg font-black tracking-widest text-muted-foreground">{match.predicted_score || "- : -"}</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">
                      {isAnalyzing[match.id] ? <Loader2 className="animate-spin" /> : (match.confidence === null ? 'ANALİZ BEKLİYOR' : 'TAHMİN')}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    <img src={match.awayTeam?.logoUrl || ''} alt={match.awayTeam?.name || ''} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-center leading-tight line-clamp-2 w-full">{match.awayTeam?.name}</span>
                  </div>
                </div>

                <div className="mt-auto space-y-2">
                    <div className="w-full">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium flex items-center gap-1.5 text-accent"><Zap size={14}/> Güven Skoru</span>
                            <span className="text-sm font-bold text-accent">{match.confidence?.toFixed(1) || '--'}%</span>
                        </div>
                        <Progress value={match.confidence || 0} className="h-2 [&>div]:bg-accent" />
                    </div>
                     <div className="flex justify-around text-center text-xs text-muted-foreground pt-2">
                        <div>
                            <p className="font-bold text-sm text-primary">{(match.home_win_prob ?? 0).toFixed(1)}%</p>
                            <p>Ev Sahibi</p>
                        </div>
                        <div>
                            <p className="font-bold text-sm">{(match.draw_prob ?? 0).toFixed(1)}%</p>
                            <p>Beraberlik</p>
                        </div>
                         <div>
                            <p className="font-bold text-sm text-destructive">{(match.away_win_prob ?? 0).toFixed(1)}%</p>
                            <p>Deplasman</p>
                        </div>
                    </div>
                </div>

              </CardContent>
            </Card>
          ))
        )}
      </div>

       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-headline">
              {selectedMatch ? `${selectedMatch.homeTeam?.name} vs ${selectedMatch.awayTeam?.name}` : 'Analiz'}
            </DialogTitle>
            <DialogDescription>
              Matematiksel model ve kural tabanlı yorumun birleşimi.
            </DialogDescription>
          </DialogHeader>
          {selectedMatch && (
            <div className="grid md:grid-cols-5 gap-x-8 gap-y-6 py-4 text-sm">
                <div className="md:col-span-2 space-y-4">
                    <h3 className="font-semibold text-primary flex items-center gap-2"><BrainCircuit size={18}/> Matematiksel Analiz</h3>
                    <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground flex items-center gap-2"><Percent size={16}/> Olasılıklar</span>
                        <div className="flex gap-4">
                            <span className="font-mono" title="Ev Sahibi">{`1: ${(selectedMatch.home_win_prob ?? 0).toFixed(1)}%`}</span>
                            <span className="font-mono" title="Beraberlik">{`X: ${(selectedMatch.draw_prob ?? 0).toFixed(1)}%`}</span>
                            <span className="font-mono" title="Deplasman">{`2: ${(selectedMatch.away_win_prob ?? 0).toFixed(1)}%`}</span>
                        </div>
                    </div>
                     <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground flex items-center gap-2"><Target size={16}/> Tahmini Skor</span>
                        <span className="font-bold text-lg font-mono">{selectedMatch.predicted_score}</span>
                    </div>
                     <div className="flex justify-between items-center border bg-card p-3 rounded-lg">
                        <span className="font-medium text-accent flex items-center gap-2"><Zap size={16}/> Güven Skoru</span>
                        <span className="font-bold text-lg text-accent">{(selectedMatch.confidence ?? 0).toFixed(1)}%</span>
                    </div>
                </div>

                <div className="md:col-span-3 space-y-3">
                     <h3 className="font-semibold text-primary flex items-center gap-2"><Bot size={18}/> Analiz Yorumu</h3>
                     <div className="text-muted-foreground leading-relaxed bg-muted/50 p-4 rounded-lg border min-h-[100px]">
                        {selectedMatchAnalysis ? (
                            <p>{selectedMatchAnalysis.aiInterpretation}</p>
                        ): (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        )}
                     </div>
                </div>
                
                <div className="md:col-span-5">
                    <h3 className="font-semibold text-primary flex items-center gap-2 mb-2"><Flame size={18}/> Form Durumu</h3>
                     {isFormLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {homeTeamForm && selectedMatch?.homeTeam?.name && <TeamForm form={homeTeamForm} teamName={selectedMatch.homeTeam.name} />}
                            {awayTeamForm && selectedMatch?.awayTeam?.name && <TeamForm form={awayTeamForm} teamName={selectedMatch.awayTeam.name} />}
                        </div>
                    )}
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
