
import { NextResponse } from "next/server";
import { spawn } from "child_process";

// Lig Kodları Haritası
const LEAGUE_MAP: Record<string, string> = {
  "Premier League": "PL",
  "Primera Division": "PD",
  "Bundesliga": "BL1",
  "Serie A": "SA",
  "Ligue 1": "FL1",
  "Championship": "ELC",
  "Primeira Liga": "PPL",
  "Eredivisie": "DED",
  "UEFA Champions League": "CL"
};

const FOOTBALL_API_KEY = "a938377027ec4af3bba0ae5a3ba19064";

// --- KURAL TABANLI YORUMCU (YAPAY ZEKA YERİNE) ---
function generateStaticComment(result: any, homeTeam: string, awayTeam: string) {
  const hw = result.home_win;
  const aw = result.away_win;
  const draw = result.draw;
  const score = result.score_prediction;
  const homeXG = result.stats?.home_xg || result.stats?.home_xg_poisson || 0;
  const awayXG = result.stats?.away_xg || result.stats?.away_xg_poisson || 0;

  let comment = "";

  // 1. KAZANMA OLASILIĞINA GÖRE YORUM
  if (hw > 65) {
    comment = `Veriler ${homeTeam} takımını mutlak favori gösteriyor (%${hw}). İstatistiksel olarak ev sahibinin ${score} gibi net bir skorla kazanması bekleniyor.`;
  } else if (aw > 65) {
    comment = `Deplasman ekibi ${awayTeam} ligdeki formuyla çok ağır basıyor (%${aw}). Ev sahibinin puan alması sürpriz olur. Beklenen sonuç: ${score}.`;
  } else if (hw > 50) {
    comment = `${homeTeam} saha ve seyirci avantajıyla bir adım önde (%${hw}). Ancak ${awayTeam} savunma disiplinini korursa zorluk çıkarabilir.`;
  } else if (aw > 50) {
    comment = `${awayTeam} deplasmanda olmasına rağmen galibiyete daha yakın duruyor (%${aw}). ${homeTeam} savunma açıklarını kapatmalı.`;
  } else if (draw > 34 || Math.abs(hw - aw) < 10) {
    comment = `Bu maç tam bir taktik savaşına sahne olacak. İki takımın güçleri birbirine çok denk (%${hw} - %${aw}). Beraberlik veya tek farklı bir sonuç muhtemel.`;
  } else {
    comment = `Oldukça dengeli ve her sonuca açık bir karşılaşma. İstatistikler ${hw > aw ? homeTeam : awayTeam} tarafını çok hafifçe işaret etse de riskli bir maç.`;
  }

  // 2. GOL BEKLENTİSİNE (xG) GÖRE EKLEME
  const totalXG = homeXG + awayXG;
  
  if (totalXG > 3.2) {
    comment += " Ayrıca veriler hücum gücü yüksek iki takımı işaret ediyor; bol gollü (2.5 Üst) bir maç izleyebiliriz.";
  } else if (totalXG < 1.9) {
    comment += " İki takımın da savunma kurgusu ön planda olabilir. Düşük tempolu ve az gollü (2.5 Alt) bir mücadele bekleniyor.";
  } else if (awayXG > homeXG + 0.5) {
    comment += ` ${awayTeam} takımının gol yollarındaki etkinliği dikkat çekici.`;
  }
  
  const homeInjuries = result.stats?.home_injuries || 0;
  const awayInjuries = result.stats?.away_injuries || 0;

  if (homeInjuries > 2) {
      comment += ` ${homeTeam} takımındaki ${homeInjuries} sakatlık, takımın performansını olumsuz etkileyebilir.`;
  }
  if (awayInjuries > 2) {
       comment += ` ${awayTeam} cephesindeki ${awayInjuries} eksik oyuncu, maç dengesini değiştirebilir.`;
  }


  return comment;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { homeTeam, awayTeam, league, homeId, awayId } = body;

    console.log(`🧮 ANALİZ (HIBRIT): ${homeTeam} vs ${awayTeam}`);

    const leagueCode = LEAGUE_MAP[league] || "PL";
    let pythonInputData: any = { is_simulation: true, home_name: homeTeam, away_name: awayTeam };

    // HİBRİT MODEL İÇİN VERİ TOPLAMA
    try {
      // Puan Durumu, Form, Oranlar ve Sakatlıklar için paralel istekler
      const standingsUrl = `https://api.football-data.org/v4/competitions/${leagueCode}/standings`;
      const homeFormUrl = `https://api.football-data.org/v4/teams/${homeId}/matches?status=FINISHED&limit=5`;
      const awayFormUrl = `https://api.football-data.org/v4/teams/${awayId}/matches?status=FINISHED&limit=5`;
      const oddsUrl = `https://api.football-data.org/v4/matches?competitions=${leagueCode}&status=SCHEDULED`;
      const homeSquadUrl = `https://api.football-data.org/v4/teams/${homeId}`;
      const awaySquadUrl = `https://api.football-data.org/v4/teams/${awayId}`;


      const [standingsRes, homeFormRes, awayFormRes, oddsRes, homeSquadRes, awaySquadRes] = await Promise.all([
        fetch(standingsUrl, { headers: { "X-Auth-Token": FOOTBALL_API_KEY }, next: { revalidate: 3600 } }),
        fetch(homeFormUrl, { headers: { "X-Auth-Token": FOOTBALL_API_KEY }, next: { revalidate: 3600 } }),
        fetch(awayFormUrl, { headers: { "X-Auth-Token": FOOTBALL_API_KEY }, next: { revalidate: 3600 } }),
        fetch(oddsUrl, { headers: { "X-Auth-Token": FOOTBALL_API_KEY }, next: { revalidate: 3600 } }),
        fetch(homeSquadUrl, { headers: { "X-Auth-Token": FOOTBALL_API_KEY }, next: { revalidate: 3600 } }),
        fetch(awaySquadUrl, { headers: { "X-Auth-Token": FOOTBALL_API_KEY }, next: { revalidate: 3600 } })
      ]);
      
      let homeStats, awayStats, league_avg_home_goals, league_avg_away_goals;
      let home_form:any[] = [], away_form:any[] = [];
      let odds = {};
      let injuries = { home: 0, away: 0 };

      // 1. Puan Durumu ve Lig Ortalamaları
      if (standingsRes.ok) {
        const standingsData = await standingsRes.json();
        const table = standingsData.standings?.[0]?.table || [];
        
        homeStats = table.find((t: any) => t.team.id === homeId) || table.find((t: any) => t.team.name.includes(homeTeam));
        awayStats = table.find((t: any) => t.team.id === awayId) || table.find((t: any) => t.team.name.includes(awayTeam));
        
        let totalHomeGoals = 0, totalAwayGoals = 0, totalMatches = 0;
        table.forEach((team: any) => {
            totalHomeGoals += team.goalsFor;
            totalAwayGoals += team.goalsAgainst; 
            totalMatches += team.playedGames;
        });

        league_avg_home_goals = (totalHomeGoals / totalMatches) || 1.45;
        league_avg_away_goals = (totalAwayGoals / totalMatches) || 1.15;
      }
      
      // 2. Form Verisi
      if (homeFormRes.ok) {
        const homeData = await homeFormRes.json();
        const teamId = homeId;
        home_form = homeData.matches.map((m: any) => {
            let result: "W" | "D" | "L";
            const homeScore = m.score.fullTime.home;
            const awayScore = m.score.fullTime.away;
            const isHomeTeam = m.homeTeam.id.toString() === teamId.toString();

            if (homeScore === awayScore) {
                result = "D";
            } else if ((isHomeTeam && homeScore > awayScore) || (!isHomeTeam && awayScore > homeScore)) {
                result = "W";
            } else {
                result = "L";
            }
            return { result };
        });
      }
       if (awayFormRes.ok) {
        const awayData = await awayFormRes.json();
        const teamId = awayId;
        away_form = awayData.matches.map((m: any) => {
            let result: "W" | "D" | "L";
            const homeScore = m.score.fullTime.home;
            const awayScore = m.score.fullTime.away;
            const isHomeTeam = m.homeTeam.id.toString() === teamId.toString();

            if (homeScore === awayScore) {
                result = "D";
            } else if ((isHomeTeam && homeScore > awayScore) || (!isHomeTeam && awayScore > homeScore)) {
                result = "W";
            } else {
                result = "L";
            }
            return { result };
        });
      }
      
      // 3. Oran Verisi
      if(oddsRes.ok){
        const oddsData = await oddsRes.json();
        const matchWithOdds = oddsData.matches.find((m: any) => m.homeTeam.id === homeId && m.awayTeam.id === awayId);
        if (matchWithOdds && matchWithOdds.odds && matchWithOdds.odds.homeWin) {
            odds = {
                home: matchWithOdds.odds.homeWin,
                draw: matchWithOdds.odds.draw,
                away: matchWithOdds.odds.awayWin
            };
        }
      }

      // 4. Sakatlık Verisi
      if (homeSquadRes.ok) {
          const squadData = await homeSquadRes.json();
          injuries.home = squadData.squad?.filter((p: any) => p.status === 'INJURED').length || 0;
      }
      if (awaySquadRes.ok) {
          const squadData = await awaySquadRes.json();
          injuries.away = squadData.squad?.filter((p: any) => p.status === 'INJURED').length || 0;
      }

      if (homeStats && awayStats && homeStats.playedGames > 0 && awayStats.playedGames > 0) {
        pythonInputData = {
          is_simulation: false,
          home: { played: homeStats.playedGames, goals_for: homeStats.goalsFor, goals_against: homeStats.goalsAgainst },
          away: { played: awayStats.playedGames, goals_for: awayStats.goalsFor, goals_against: awayStats.goalsAgainst },
          league_avg_home_goals,
          league_avg_away_goals,
          home_form,
          away_form,
          odds,
          injuries,
        };
      }

    } catch (err) {
      console.error("Hibrid Model için veri çekme hatası:", err);
    }

    // PYTHON HESAPLAMASI
    const pythonPromise = new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3.11', ['analysis.py', JSON.stringify(pythonInputData)]);
      
      let stdoutData = "";
      let stderrData = "";

      pythonProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
      pythonProcess.stderr.on('data', (data) => { stderrData += data.toString(); });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderrData || `Python exit code: ${code}`));
        } else {
          resolve(stdoutData);
        }
      });
      
      pythonProcess.on('error', (err) => {
        reject(new Error(`Spawn Hatası: ${err.message}`));
      });
    });

    try {
      const pythonOutput = await pythonPromise as string;
      
      let predictionResult;
      try {
        predictionResult = JSON.parse(pythonOutput);
        if (predictionResult.error) {
            throw new Error(predictionResult.error);
        }

      } catch (parseError) {
        throw new Error(`JSON Parse Hatası. Gelen Veri: ${pythonOutput.substring(0, 200)}`);
      }

      const staticComment = generateStaticComment(predictionResult, homeTeam, awayTeam);

      return NextResponse.json({
          mathAnalysis: predictionResult,
          aiInterpretation: staticComment 
      });

    } catch (pythonError: any) {
        console.error("Python Çalıştırma veya Parse Hatası:", pythonError.message);
        return NextResponse.json({ error: `Python Hatası: ${pythonError.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Sunucu Hatası:", error);
    return NextResponse.json({ error: error.message || "Sunucu hatası" }, { status: 500 });
  }
}

    