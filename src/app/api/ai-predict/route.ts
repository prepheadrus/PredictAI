'use server';
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { ai } from '@/ai/genkit';
import { leagues } from '@/lib/mock-data'; // Lig kodunu bulmak için

interface PythonOutput {
    math_model: string;
    home_win: number;
    draw: number;
    away_win: number;
    score_prediction: string;
    confidence: number;
    error?: string;
}

// Lig ID'sini lig koduna çeviren harita (API için gerekli)
const leagueIdToCode: { [key: number]: string } = {
    1: "PL",  // Premier League
    2: "PD",  // La Liga
    3: "BL1", // Bundesliga
    4: "FL1", // Ligue 1
    5: "SA",  // Serie A
    2001: "CL" // Champions League
};


async function getStandings(leagueCode: string) {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    if (!apiKey) {
        throw new Error('FOOTBALL_DATA_API_KEY is not defined in .env');
    }
    const response = await fetch(`https://api.football-data.org/v4/competitions/${leagueCode}/standings`, {
        headers: { 'X-Auth-Token': apiKey },
        cache: 'no-store'
    });
    if (!response.ok) {
        const errorData = await response.json();
        console.error(`Failed to fetch standings for ${leagueCode}:`, errorData.message);
        return null;
    }
    return response.json();
}

function runPythonAnalysis(stats: string | null, home: string, away: string, league: string): Promise<PythonOutput> {
  return new Promise((resolve, reject) => {
    const pythonExecutable = process.env.PYTHON_PATH || 'python3.11';
    const scriptPath = path.join(process.cwd(), 'analysis.py');
    
    // Eğer stats varsa, bunu tek argüman olarak kullan. Yoksa, eski yöntemi kullan.
    const args = stats ? [scriptPath, stats] : [scriptPath, home, away, league];

    const pythonProcess = spawn(pythonExecutable, args, { shell: true });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script stderr: ${stderr}`);
        return reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      }
      try {
        const result: PythonOutput = JSON.parse(stdout);
        if (result.error) {
            return reject(new Error(result.error));
        }
        resolve(result);
      } catch (e) {
        console.error('Failed to parse Python script output:', stdout);
        reject(new Error('Failed to parse JSON from Python script.'));
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      if ((err as any).code === 'ENOENT') {
        return reject(new Error(`Python executable not found at '${pythonExecutable}'. Please ensure Python is installed and the path is correct. Current PATH: ${process.env.PATH}`));
      }
      reject(err);
    });
  });
}

// API Route Handler
export async function POST(req: NextRequest) {
  try {
    const { homeTeam, awayTeam, leagueName, homeTeamId, awayTeamId, leagueId } = await req.json();

    if (!homeTeam || !awayTeam || !leagueName) {
      return NextResponse.json({ error: 'Missing team or league information' }, { status: 400 });
    }

    let statsForPython: string | null = null;
    const leagueCode = leagueIdToCode[leagueId];

    if (leagueCode) {
        const standingsData = await getStandings(leagueCode);
        if (standingsData && standingsData.standings && standingsData.standings[0]?.table) {
            const table = standingsData.standings[0].table;
            
            const homeTeamStats = table.find((t: any) => t.team.id === homeTeamId);
            const awayTeamStats = table.find((t: any) => t.team.id === awayTeamId);

            // Lig gol ortalamalarını hesapla
            const totalMatches = table.length > 1 ? table.length * (table.length - 1) : 1;
            const totalGoals = table.reduce((sum: number, team: any) => sum + team.goalsFor, 0);
            const avgGoalsPerGame = totalMatches > 0 ? totalGoals / totalMatches : 1.35;


            // Genellikle ev sahibi takımlar biraz daha fazla gol atar.
            const league_avg_home_goals = avgGoalsPerGame + 0.15;
            const league_avg_away_goals = avgGoalsPerGame - 0.15 > 0 ? avgGoalsPerGame - 0.15 : avgGoalsPerGame;
            
            if (homeTeamStats && awayTeamStats && homeTeamStats.playedGames > 0 && awayTeamStats.playedGames > 0) {
                 const statsObject = {
                    home: {
                        played: homeTeamStats.playedGames,
                        goals_for: homeTeamStats.goalsFor,
                        goals_against: homeTeamStats.goalsAgainst
                    },
                    away: {
                        played: awayTeamStats.playedGames,
                        goals_for: awayTeamStats.goalsFor,
                        goals_against: awayTeamStats.goalsAgainst
                    },
                    league_avg_home_goals: league_avg_home_goals,
                    league_avg_away_goals: league_avg_away_goals
                 };
                 statsForPython = JSON.stringify(statsObject);
            }
        }
    }


    // 1. Python'dan matematiksel analizi al
    const mathResult = await runPythonAnalysis(statsForPython, homeTeam, awayTeam, leagueName);

    // 2. Gemini için prompt oluştur
    const promptText = `
      Bir uzman futbol analisti olarak aşağıdaki matematiksel verileri yorumla. 
      Yorumun kısa, net ve bahis odaklı olsun. Sadece maçı yorumla, olasılıkları tekrar etme.

      Matematiksel Analiz:
      - Model: ${mathResult.math_model}
      - ${homeTeam} Kazanma Olasılığı: %${mathResult.home_win}
      - Beraberlik Olasılığı: %${mathResult.draw}
      - ${awayTeam} Kazanma Olasılığı: %${mathResult.away_win}
      - Tahmini Skor: ${mathResult.score_prediction}

      Lütfen bu verilere dayanarak kısa bir maç yorumu yap.
    `;

    // 3. Gemini'den yorumsal analizi al
    const { text } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: promptText,
    });
    
    const aiInterpretation = text;

    // 4. İki sonucu birleştirip frontend'e gönder
    return NextResponse.json({
      mathAnalysis: mathResult,
      aiInterpretation: aiInterpretation,
    });

  } catch (error: any) {
    console.error('[AI-PREDICT API ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
