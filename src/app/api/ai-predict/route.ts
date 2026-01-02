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
  const homeXG = result.stats?.home_xg || 0;
  const awayXG = result.stats?.away_xg || 0;

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

  return comment;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { homeTeam, awayTeam, league, homeId, awayId } = body;

    console.log(`🧮 ANALİZ (NO-AI): ${homeTeam} vs ${awayTeam}`);

    const leagueCode = LEAGUE_MAP[league] || "PL";
    let pythonInputData: object = { is_simulation: true, home_name: homeTeam, away_name: awayTeam };

    // 1. GERÇEK VERİYİ ÇEK (Puan Durumu)
    try {
      const standingsUrl = `https://api.football-data.org/v4/competitions/${leagueCode}/standings`;
      const standingsRes = await fetch(standingsUrl, {
        headers: { "X-Auth-Token": FOOTBALL_API_KEY },
        next: { revalidate: 3600 }
      });

      if (standingsRes.ok) {
        const standingsData = await standingsRes.json();
        const table = standingsData.standings?.[0]?.table || [];

        // ID veya İsim ile Eşleştirme
        let homeStats = table.find((t: any) => t.team.id === homeId);
        let awayStats = table.find((t: any) => t.team.id === awayId);

        // ID bulamazsa isme bak
        if (!homeStats) homeStats = table.find((t: any) => t.team.name.includes(homeTeam) || homeTeam.includes(t.team.name));
        if (!awayStats) awayStats = table.find((t: any) => t.team.name.includes(awayTeam) || awayTeam.includes(t.team.name));
        
        let totalHomeGoals = 0;
        let totalAwayGoals = 0;
        let totalMatches = 0;

        table.forEach((team: any) => {
            totalHomeGoals += team.goalsFor; // Bu aslında toplam gol, sadece bir ortalama için kullanılıyor
            totalAwayGoals += team.goalsAgainst; 
            totalMatches += team.playedGames;
        });

        const numTeams = table.length > 0 ? table.length : 1;
        const avgMatchesPerTeam = totalMatches / numTeams;
        
        const league_avg_home_goals = (totalHomeGoals / totalMatches) || 1.45;
        const league_avg_away_goals = (totalAwayGoals / totalMatches) || 1.15;


        if (homeStats && awayStats && homeStats.playedGames > 0 && awayStats.playedGames > 0) {
          pythonInputData = {
            is_simulation: false,
            home: { played: homeStats.playedGames, goals_for: homeStats.goalsFor, goals_against: homeStats.goalsAgainst },
            away: { played: awayStats.playedGames, goals_for: awayStats.goalsFor, goals_against: awayStats.goalsAgainst },
            league_avg_home_goals: league_avg_home_goals,
            league_avg_away_goals: league_avg_away_goals
          };
        }
      }
    } catch (err) {
      console.error("Veri Çekme Hatası:", err);
    }

    // 2. PYTHON HESAPLAMASI (MATEMATİK)
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
            // Python'un kendi döndürdüğü JSON hatası
            throw new Error(predictionResult.error);
        }

      } catch (parseError) {
        // Eğer parse işlemi başarısız olursa, gelen ham çıktıyı hata olarak fırlat
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
