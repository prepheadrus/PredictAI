
'use client';

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calendar, Clock, TrendingUp } from "lucide-react";
import { refreshAndAnalyzeMatches } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { MatchWithTeams } from "@/lib/types";

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
        return <Badge variant="default">Bitti</Badge>;
      case "LIVE":
        return <Badge variant="destructive">Canlı</Badge>;
      case "HT":
        return <Badge variant="outline">Devre Arası</Badge>;
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
      <Badge variant={variant} className="flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        {confidence.toFixed(0)}%
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
            <TrendingUp className="mr-2 h-4 w-4" />
            Güven Skoruna Göre
          </Button>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Fikstürü Yenile ve Analiz Et
        </Button>
      </div>

      <div className="space-y-3">
        {sortedMatches.map((match) => (
          <div
            key={match.id}
            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">
                      {match.homeTeam?.name || "Bilinmeyen Takım"}
                    </div>
                    <div className="text-muted-foreground">
                      {match.awayTeam?.name || "Bilinmeyen Takım"}
                    </div>
                  </div>
                  <div className="text-center min-w-[60px]">
                    {match.status === "FT" && match.home_score !== null && match.away_score !== null ? (
                      <div className="text-2xl font-bold">
                        {match.home_score} - {match.away_score}
                      </div>
                    ) : match.predicted_score ? (
                      <div className="text-lg text-muted-foreground">
                        {match.predicted_score}
                      </div>
                    ) : (
                      <div className="text-lg text-muted-foreground">-</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                  {match.match_date && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(match.match_date), "dd MMM yyyy HH:mm", { locale: tr })}
                    </div>
                  )}
                  {getStatusBadge(match.status)}
                </div>

                {match.confidence && match.status === 'NS' && (
                  <div className="flex gap-2 items-center text-sm">
                    <span className="text-muted-foreground">Tahmin:</span>
                    <Badge variant="outline">Ev: {match.home_win_prob?.toFixed(1)}%</Badge>
                    <Badge variant="outline">Beraberlik: {match.draw_prob?.toFixed(1)}%</Badge>
                    <Badge variant="outline">Deplasman: {match.away_win_prob?.toFixed(1)}%</Badge>
                  </div>
                )}
              </div>

              {match.confidence && (
                <div className="flex items-center gap-2">
                  {getConfidenceBadge(match.confidence)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
