
'use client';

import { useState } from "react";
import { format } from "date-fns";
import { RefreshCw, Calendar, Trophy, BrainCircuit, Bot, Zap, Percent, Target, BarChart2 } from "lucide-react";
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
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";


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
  const [data, setData] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/ingest');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `API Hatası: ${response.status}`);
      }
      
      if (!result.matches || !Array.isArray(result.matches) || result.matches.length === 0) {
        setData([]);
        toast({ title: "Bilgi", description: "Bu tarih aralığında seçili liglerde maç yok." });
        return;
      }

      const formattedData = result.matches.map((match: any) => ({
        fixture: { id: match.id, date: match.utcDate, status: { short: match.status } },
        league: { id: match.competition?.id, name: match.competition?.name || "Lig", logo: match.competition?.emblem || null },
        teams: {
          home: { id: match.homeTeam?.id, name: match.homeTeam?.name || "Ev Sahibi", logo: match.homeTeam?.crest || null },
          away: { id: match.awayTeam?.id, name: match.awayTeam?.name || "Deplasman", logo: match.awayTeam?.crest || null }
        },
        goals: { home: match.score?.fullTime?.home ?? null, away: match.score?.fullTime?.away ?? null }
      }));

      setData(formattedData);
      toast({ title: "Fikstür Güncellendi", description: `${formattedData.length} maç başarıyla çekildi.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fikstür Yenilenemedi", description: error.message || "Lütfen internet bağlantınızı kontrol edin." });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePredict = async (match: Match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
    setIsPredicting(true);
    setPrediction(null);
    setPredictionError(null);

    try {
        const response = await fetch('/api/ai-predict', {
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
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Tahmin alınamadı.');
        }
        setPrediction(result);
    } catch (error: any) {
        setPredictionError(error.message);
        toast({
            variant: "destructive",
            title: "Tahmin Hatası",
            description: error.message,
        });
    } finally {
        setIsPredicting(false);
    }
  };

  const strengthData = prediction?.mathAnalysis.stats.home_attack ? [
    { name: 'Hücum Gücü', home: prediction.mathAnalysis.stats.home_attack, away: prediction.mathAnalysis.stats.away_attack },
    { name: 'Savunma Gücü', home: prediction.mathAnalysis.stats.home_defense, away: prediction.mathAnalysis.stats.away_defense },
  ] : [];

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
            <Card key={match.fixture.id} onClick={() => handlePredict(match)} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    {match.league.logo && <img src={match.league.logo} alt="lig" className="w-5 h-5 object-contain"/>}
                    <Badge variant="secondary" className="text-[10px] font-normal px-1.5 h-5">{match.league.name}</Badge>
                  </div>
                  <span suppressHydrationWarning className="text-xs text-muted-foreground font-mono">
                    {match.fixture.date ? format(new Date(match.fixture.date), "HH:mm") : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    {match.teams.home.logo ? <img src={match.teams.home.logo} alt={match.teams.home.name} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" /> : <Trophy className="w-8 h-8 text-gray-200" />}
                    <span className="text-xs font-bold text-center leading-tight line-clamp-2 w-full">{match.teams.home.name}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md min-w-[70px]">
                    <span className="text-lg font-black tracking-widest">{match.goals.home ?? "-"} : {match.goals.away ?? "-"}</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">{match.fixture.status.short}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    {match.teams.away.logo ? <img src={match.teams.away.logo} alt={match.teams.away.name} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" /> : <Trophy className="w-8 h-8 text-gray-200" />}
                    <span className="text-xs font-bold text-center leading-tight line-clamp-2 w-full">{match.teams.away.name}</span>
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
          {isPredicting ? (
             <div className="grid md:grid-cols-2 gap-6 py-4">
                <div>
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
                <div>
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-24 w-full" />
                </div>
             </div>
          ) : predictionError ? (
            <Alert variant="destructive" className="my-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Tahmin Hatası</AlertTitle>
                <AlertDescription>
                    <pre className="mt-2 w-full whitespace-pre-wrap rounded-md bg-slate-950 p-4 font-mono text-xs text-slate-50">
                    {predictionError}
                    </pre>
                </AlertDescription>
            </Alert>
          ) : prediction && (
            <div className="grid md:grid-cols-5 gap-x-8 gap-y-6 py-4 text-sm">
                <div className="md:col-span-2 space-y-4">
                    <h3 className="font-semibold text-primary flex items-center gap-2"><BrainCircuit size={18}/> Matematiksel Analiz</h3>
                    <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground flex items-center gap-2"><Percent size={16}/> Olasılıklar</span>
                        <div className="flex gap-4">
                            <span className="font-mono" title="Ev Sahibi">{`1: ${prediction.mathAnalysis.home_win}%`}</span>
                            <span className="font-mono" title="Beraberlik">{`X: ${prediction.mathAnalysis.draw}%`}</span>
                            <span className="font-mono" title="Deplasman">{`2: ${prediction.mathAnalysis.away_win}%`}</span>
                        </div>
                    </div>
                     <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground flex items-center gap-2"><Target size={16}/> Tahmini Skor</span>
                        <span className="font-bold text-lg font-mono">{prediction.mathAnalysis.score_prediction}</span>
                    </div>
                     <div className="flex justify-between items-center border bg-card p-3 rounded-lg">
                        <span className="font-medium text-accent flex items-center gap-2"><Zap size={16}/> Güven Skoru</span>
                        <span className="font-bold text-lg text-accent">{prediction.mathAnalysis.confidence}%</span>
                    </div>
                </div>

                <div className="md:col-span-3 space-y-3">
                     <h3 className="font-semibold text-primary flex items-center gap-2"><Bot size={18}/> Analiz Yorumu</h3>
                     <p className="text-muted-foreground leading-relaxed bg-muted/50 p-4 rounded-lg border">
                        {prediction.aiInterpretation}
                     </p>
                </div>
                
                {strengthData && strengthData.length > 0 && (
                  <div className="md:col-span-5">
                    <h3 className="font-semibold text-primary flex items-center gap-2 mb-4"><BarChart2 size={18}/> Güç Karşılaştırması</h3>
                    <ResponsiveContainer width="100%" height={200}>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

    