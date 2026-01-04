"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calendar, Clock, TrendingUp, BarChart, ChevronDown, ArrowRight } from "lucide-react";
import { refreshAndAnalyzeMatches } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import type { MatchWithTeams } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TeamFormDisplay } from "./team-form-display";

interface MatchListProps {
  initialMatches: MatchWithTeams[];
}

export function MatchList({ initialMatches }: MatchListProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "confidence">("date");
  const { toast } = useToast();

  const sortedMatches = useMemo(() => {
    const matches = [...initialMatches];
    if (sortBy === "date") {
      return matches.sort((a, b) => {
        if (!a.match_date || !b.match_date) return 0;
        return new Date(b.match_date).getTime() - new Date(a.match_date).getTime();
      });
    } else {
      return matches.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    }
  }, [initialMatches, sortBy]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast({
        title: "İşlem Başlatıldı",
        description: "Maç verileri çekiliyor ve analiz ediliyor...",
    });
    try {
      const result = await refreshAndAnalyzeMatches();
      if (result.success) {
        toast({
          title: "İşlem Tamamlandı!",
          description: result.message,
        });
        window.location.reload();
      } else {
        toast({
          title: "Hata",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "NS":
        return <Badge variant="secondary">Oynanmadı</Badge>;
      case "FT":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Bitti</Badge>;
      case "LIVE":
        return <Badge variant="destructive">Canlı</Badge>;
      case "HT":
        return <Badge variant="outline" className="bg-yellow-500 text-white">Devre Arası</Badge>;
      case "PST":
        return <Badge variant="secondary">Ertelendi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return null;
    
    let variant: "default" | "secondary" | "destructive" = "secondary";
    if (confidence >= 75) variant = "default";
    else if (confidence >= 60) variant = "secondary";
    else variant = "destructive";

    return (
      <Badge variant={variant} className="flex items-center gap-1 text-sm py-1 px-3">
        <TrendingUp className="w-4 h-4" />
        {confidence.toFixed(0)}% Güven
      </Badge>
    );
  };

  if (sortedMatches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          Veritabanında hiç maç bulunamadı.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Başlamak için fikstürü yenileyin ve verileri çekin.
        </p>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Fikstürü Yenile ve Analiz Et
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={sortBy === "date" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("date")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Tarihe Göre
          </Button>
          <Button
            variant={sortBy === "confidence" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("confidence")}
          >
            <BarChart className="mr-2 h-4 w-4" />
            Güven Skoruna Göre
          </Button>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Fikstürü Yenile ve Analiz Et
        </Button>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-3">
        {sortedMatches.map((match) => (
          <AccordionItem key={match.id} value={`match-${match.id}`} className="border rounded-lg bg-card overflow-hidden">
            <AccordionTrigger className="p-4 hover:bg-muted/50 transition-colors [&[data-state=open]>svg]:text-primary">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full">
                    <div className="flex-1 space-y-1 text-left">
                        <div className="font-semibold text-lg flex items-center gap-2">
                           <span>{match.homeTeam?.name || "Bilinmeyen Takım"}</span>
                           <span className="text-muted-foreground text-sm">vs</span>
                           <span>{match.awayTeam?.name || "Bilinmeyen Takım"}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center text-sm text-muted-foreground">
                        {match.match_date && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {formatInTimeZone(new Date(match.match_date), 'Europe/Istanbul', "dd MMM yyyy", { locale: tr })}
                                <span className="text-xs text-muted-foreground/80">
                                    ({formatInTimeZone(new Date(match.match_date), 'Europe/Istanbul', "HH:mm", { locale: tr })})
                                </span>
                            </div>
                        )}
                        {getStatusBadge(match.status)}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-center min-w-[80px]">
                            {match.status === "FT" && match.home_score !== null && match.away_score !== null ? (
                            <div className="text-2xl font-bold">
                                {match.home_score} - {match.away_score}
                            </div>
                            ) : match.predicted_score ? (
                            <div className="text-lg text-primary/80 font-mono" title="Tahmini Skor">
                                {match.predicted_score}
                            </div>
                            ) : (
                            <div className="text-lg text-muted-foreground">-</div>
                            )}
                        </div>
                        {getConfidenceBadge(match.confidence)}
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0 border-t bg-muted/20">
              <div className="space-y-4">
                 {match.confidence && match.status === 'NS' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-background rounded-md">
                            <p className="text-sm text-muted-foreground">Ev Sahibi</p>
                            <p className="text-xl font-bold text-primary">{match.home_win_prob?.toFixed(1)}%</p>
                        </div>
                         <div className="p-3 bg-background rounded-md">
                            <p className="text-sm text-muted-foreground">Beraberlik</p>
                            <p className="text-xl font-bold text-primary">{match.draw_prob?.toFixed(1)}%</p>
                        </div>
                         <div className="p-3 bg-background rounded-md">
                            <p className="text-sm text-muted-foreground">Deplasman</p>
                            <p className="text-xl font-bold text-primary">{match.away_win_prob?.toFixed(1)}%</p>
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {match.home_team_id && <TeamFormDisplay teamId={match.home_team_id} teamName={match.homeTeam?.name || ''} />}
                    {match.away_team_id && <TeamFormDisplay teamId={match.away_team_id} teamName={match.awayTeam?.name || ''} />}
                </div>

                {match.confidence && (
                     <Button asChild className="w-full mt-4">
                        <Link href={`/analysis/${match.id}`}>
                           Detaylı Analiz Sayfasına Git <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                    </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}