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
    2021: "PL",  // Premier League
    2014: "PD",  // La Liga
    2002: "BL1", // Bundesliga
    2015: "FL1", // Ligue 1
    2019: "SA",  // Serie A
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

    if (!homeTeam || !awayTeam || !leagueName || !homeTeamId || !awayTeamId || !leagueId) {
      return NextResponse.json({ error: 'Missing team or league information' }, { status: 400 });
    }

    let statsForPython: string | null = null;
    const leagueCode = leagueIdToCode[leagueId];

    if (leagueCode) {
        const standingsData = await getStandings(leagueCode);
        if (standingsData && standingsData.standings && standingsData.standings[0]?.table) {
            const table = standingsData.standings[0].table;
            
            const homeStats = table.find((t: any) => t.team.id === homeTeamId);
            const awayStats = table.find((t: any) => t.team.id === awayTeamId);
            
            if (homeStats && awayStats && homeStats.playedGames > 0 && awayStats.playedGames > 0) {
                let totalHomeGoals = 0;
                let totalAwayGoals = 0;
                let totalMatches = 0;

                table.forEach((team: any) => {
                    totalHomeGoals += team.goalsFor;
                    totalAwayGoals += team.goalsAgainst; // Simple approximation
                    totalMatches += team.playedGames;
                });
                
                const avgMatches = totalMatches / table.length;
                const league_avg_home_goals = (totalHomeGoals / totalMatches) || 1.45;
                const league_avg_away_goals = (totalAwayGoals / totalMatches) || 1.15;

                 const statsObject = {
                    home: {
                        played: homeStats.playedGames,
                        goals_for: homeStats.goalsFor,
                        goals_against: homeStats.goalsAgainst
                    },
                    away: {
                        played: awayStats.playedGames,
                        goals_for: awayStats.goalsFor,
                        goals_against: awayStats.goalsAgainst
                    },
                    league_avg_home_goals: league_avg_home_goals,
                    league_avg_away_goals: league_avg_away_goals
                 };
                 statsForPython = JSON.stringify(statsObject);
            } else {
                 console.log(`Could not find one or both teams in standings. Home ID: ${homeTeamId}, Away ID: ${awayTeamId}`);
                 const tableIds = table.map((t:any) => t.team.id);
                 console.log(`Available IDs in table: ${tableIds.join(', ')}`);
                 statsForPython = JSON.stringify({ is_simulation: true, home_name: homeTeam, away_name: awayTeam });
            }
        }
    }


    const mathResult = await runPythonAnalysis(statsForPython, homeTeam, awayTeam, leagueName);

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

    const { text } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: promptText,
    });
    
    const aiInterpretation = text;

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
