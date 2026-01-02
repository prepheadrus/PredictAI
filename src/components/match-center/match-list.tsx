'use client';

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { RefreshCw, Calendar, Trophy, BrainCircuit, Bot, Zap, Percent, Target, BarChart2, ArrowDownUp, Clock, Flame } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Progress } from "../ui/progress";
import { cn } from "@/lib/utils";
import { TeamForm, type FormResult } from "../analysis/team-form";


interface Match {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
  };
  league: {
    id: number;
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

interface PredictionResult {
  mathAnalysis: {
    math_model: string;
    home_win: number;
    draw: number;
    away_win: number;
    score_prediction: string;
    confidence: number;
    stats: {
        home_xg: number;
        away_xg: number;
        home_attack?: number;
        away_attack?: number;
        home_defense?: number;
        away_defense?: number;
    }
  };
  aiInterpretation: string;
}

type AnalyzedMatch = Match & { analysis?: PredictionResult };
type SortKey = "date" | "confidence";


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border rounded-lg shadow-lg">
        <p className="label font-bold">{`${label}`}</p>
        <p className="text-primary">{`Ev Sahibi : ${payload[0].value}`}</p>
        <p className="text-destructive">{`Deplasman : ${payload[1].value}`}</p>
      </div>
    );
  }
  return null;
};


export function MatchList() {
  const [data, setData] = useState<AnalyzedMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<AnalyzedMatch | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsLoading(true);
    setData([]);
    try {
      const response = await fetch('/api/ingest');
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || `API Hatası: ${response.status}`);
      if (!result.matches || result.matches.length === 0) {
        toast({ title: "Bilgi", description: "Bu tarih aralığında seçili liglerde maç yok." });
        return;
      }

      const formattedData: Match[] = result.matches.map((match: any) => ({
        fixture: { id: match.id, date: match.utcDate, status: { short: match.status } },
        league: { id: match.competition?.id, name: match.competition?.name || "Lig", logo: match.competition?.emblem || null },
        teams: {
          home: { id: match.homeTeam?.id, name: match.homeTeam?.name || "Ev Sahibi", logo: match.homeTeam?.crest || null },
          away: { id: match.awayTeam?.id, name: match.awayTeam?.name || "Deplasman", logo: match.awayTeam?.crest || null }
        },
        goals: { home: match.score?.fullTime?.home ?? null, away: match.score?.fullTime?.away ?? null }
      }));
      
      toast({ title: "Fikstür Çekildi", description: `${formattedData.length} maç bulundu, analizler başlıyor...` });
      
      const analyzedMatches = await Promise.all(
        formattedData.map(async (match) => {
          try {
            const predictionResponse = await fetch('/api/ai-predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  homeTeam: match.teams.home.name,
                  awayTeam: match.teams.away.name,
                  homeId: match.teams.home.id,
                  awayId: match.teams.away.id,
                  league: match.league.name,
              }),
            });
            if (!predictionResponse.ok) return match; // Analiz başarısızsa sadece maç verisini tut
            const analysis = await predictionResponse.json();
            return { ...match, analysis };
          } catch (e) {
            return match; // Hata durumunda sadece maç verisini tut
          }
        })
      );

      setData(analyzedMatches);
      toast({ title: "Analiz Tamamlandı", description: `${analyzedMatches.length} maç için tahminler hazır.` });

    } catch (error: any) {
      toast({ variant: "destructive", title: "İşlem Başarısız", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCardClick = (match: AnalyzedMatch) => {
    if (!match.analysis) {
        toast({
            variant: "destructive",
            title: "Analiz Verisi Eksik",
            description: "Bu maç için tahmin verileri yüklenemedi. Lütfen yenileyip tekrar deneyin.",
        });
        return;
    }
    setSelectedMatch(match);
    setIsModalOpen(true);
    setPredictionError(null);
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortKey === 'confidence') {
        return (b.analysis?.mathAnalysis.confidence || 0) - (a.analysis?.mathAnalysis.confidence || 0);
      }
      // Default sort by date
      return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
    });
  }, [data, sortKey]);

  const strengthData = selectedMatch?.analysis?.mathAnalysis.stats.home_attack ? [
    { name: 'Hücum Gücü', home: selectedMatch.analysis.mathAnalysis.stats.home_attack, away: selectedMatch.analysis.mathAnalysis.stats.away_attack },
    { name: 'Savunma Gücü', home: selectedMatch.analysis.mathAnalysis.stats.home_defense, away: selectedMatch.analysis.mathAnalysis.stats.away_defense },
  ] : [];

  // Mock form data with details
  const homeTeamForm: FormResult[] = [
      { result: 'W', opponentName: 'OGC Nice', score: '2-1' },
      { result: 'D', opponentName: 'PSG', score: '1-1' },
      { result: 'W', opponentName: 'FC Lorient', score: '3-0' },
      { result: 'L', opponentName: 'AS Monaco', score: '1-2' },
      { result: 'W', opponentName: 'Stade Rennais', score: '1-0' },
  ];
  const awayTeamForm: FormResult[] = [
      { result: 'L', opponentName: 'LOSC Lille', score: '0-1' },
      { result: 'D', opponentName: 'Olympique Lyonnais', score: '2-2' },
      { result: 'W', opponentName: 'Stade de Reims', score: '2-0' },
      { result: 'W', opponentName: 'FC Nantes', score: '3-1' },
      { result: 'L', opponentName: 'RC Strasbourg', score: '1-2' },
  ];


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
            <Button onClick={handleRefresh} disabled={isLoading} className="w-full sm:w-auto">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Analiz Ediliyor..." : "Fikstürü Yenile ve Analiz Et"}
            </Button>
        </CardContent>
      </Card>
      

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 w-full" />)
        ) : sortedData.length === 0 ? (
          <div className="col-span-full text-center py-10 border-2 border-dashed rounded-lg bg-muted/50">
            <p className="text-muted-foreground font-medium">Başlamak için fikstürü yenileyin.</p>
            <p className="text-xs text-muted-foreground mt-1">Yukarıdaki butona basarak verileri çekebilirsiniz.</p>
          </div>
        ) : (
          sortedData.map((match) => (
            <Card key={match.fixture.id} onClick={() => handleCardClick(match)} className={cn("hover:shadow-md transition-shadow cursor-pointer group flex flex-col", !match.analysis && "opacity-60 pointer-events-none")}>
              <CardContent className="p-4 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-2 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    {match.league.logo && <img src={match.league.logo} alt="lig" className="w-5 h-5 object-contain"/>}
                    <Badge variant="secondary" className="text-[10px] font-normal px-1.5 h-5">{match.league.name}</Badge>
                  </div>
                  <span suppressHydrationWarning className="text-xs text-muted-foreground font-mono">
                    {match.fixture.date ? format(new Date(match.fixture.date), "dd.MM HH:mm") : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2 mb-4">
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    {match.teams.home.logo ? <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" /> : <Trophy className="w-8 h-8 text-gray-200" />}
                    <span className="text-xs font-bold text-center leading-tight line-clamp-2 w-full">{match.teams.home.name}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center min-w-[70px]">
                    <span className="text-lg font-black tracking-widest text-muted-foreground">{match.analysis?.mathAnalysis.score_prediction || "- : -"}</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">{match.fixture.status.short}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    {match.teams.away.logo ? <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" /> : <Trophy className="w-8 h-8 text-gray-200" />}
                    <span className="text-xs font-bold text-center leading-tight line-clamp-2 w-full">{match.teams.away.name}</span>
                  </div>
                </div>

                <div className="mt-auto space-y-2">
                    <div className="w-full">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium flex items-center gap-1.5 text-accent"><Zap size={14}/> Güven Skoru</span>
                            <span className="text-sm font-bold text-accent">{match.analysis?.mathAnalysis.confidence.toFixed(1)}%</span>
                        </div>
                        <Progress value={match.analysis?.mathAnalysis.confidence || 0} className="h-2 [&>div]:bg-accent" />
                    </div>
                     <div className="flex justify-around text-center text-xs text-muted-foreground pt-2">
                        <div>
                            <p className="font-bold text-sm text-primary">{match.analysis?.mathAnalysis.home_win || 0}%</p>
                            <p>Ev Sahibi</p>
                        </div>
                        <div>
                            <p className="font-bold text-sm">{match.analysis?.mathAnalysis.draw || 0}%</p>
                            <p>Beraberlik</p>
                        </div>
                         <div>
                            <p className="font-bold text-sm text-destructive">{match.analysis?.mathAnalysis.away_win || 0}%</p>
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
              {selectedMatch ? `${selectedMatch.teams.home.name} vs ${selectedMatch.teams.away.name}` : 'Analiz'}
            </DialogTitle>
            <DialogDescription>
              Matematiksel model ve kural tabanlı yorumun birleşimi.
            </DialogDescription>
          </DialogHeader>
          {selectedMatch?.analysis && (
            <div className="grid md:grid-cols-5 gap-x-8 gap-y-6 py-4 text-sm">
                <div className="md:col-span-2 space-y-4">
                    <h3 className="font-semibold text-primary flex items-center gap-2"><BrainCircuit size={18}/> Matematiksel Analiz</h3>
                    <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground flex items-center gap-2"><Percent size={16}/> Olasılıklar</span>
                        <div className="flex gap-4">
                            <span className="font-mono" title="Ev Sahibi">{`1: ${selectedMatch.analysis.mathAnalysis.home_win}%`}</span>
                            <span className="font-mono" title="Beraberlik">{`X: ${selectedMatch.analysis.mathAnalysis.draw}%`}</span>
                            <span className="font-mono" title="Deplasman">{`2: ${selectedMatch.analysis.mathAnalysis.away_win}%`}</span>
                        </div>
                    </div>
                     <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground flex items-center gap-2"><Target size={16}/> Tahmini Skor</span>
                        <span className="font-bold text-lg font-mono">{selectedMatch.analysis.mathAnalysis.score_prediction}</span>
                    </div>
                     <div className="flex justify-between items-center border bg-card p-3 rounded-lg">
                        <span className="font-medium text-accent flex items-center gap-2"><Zap size={16}/> Güven Skoru</span>
                        <span className="font-bold text-lg text-accent">{selectedMatch.analysis.mathAnalysis.confidence}%</span>
                    </div>
                </div>

                <div className="md:col-span-3 space-y-3">
                     <h3 className="font-semibold text-primary flex items-center gap-2"><Bot size={18}/> Analiz Yorumu</h3>
                     <p className="text-muted-foreground leading-relaxed bg-muted/50 p-4 rounded-lg border">
                        {selectedMatch.analysis.aiInterpretation}
                     </p>
                </div>
                
                {strengthData && strengthData.length > 0 && (
                  <div className="md:col-span-3">
                    <h3 className="font-semibold text-primary flex items-center gap-2 mb-4"><BarChart2 size={18}/> Güç Karşılaştırması</h3>
                    <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={strengthData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toFixed(1)}`}/>
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))'}} />
                            <Bar dataKey="home" fill="hsl(var(--primary))" name="Ev Sahibi" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="away" fill="hsl(var(--destructive))" name="Deplasman" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="md:col-span-2">
                    <h3 className="font-semibold text-primary flex items-center gap-2 mb-4"><Flame size={18}/> Form Durumu</h3>
                    <div className="space-y-4">
                        <TeamForm form={homeTeamForm} teamName={selectedMatch.teams.home.name} />
                        <TeamForm form={awayTeamForm} teamName={selectedMatch.teams.away.name} />
                    </div>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
