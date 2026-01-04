
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, isNull, and, sql, asc } from 'drizzle-orm';
import type { MatchWithTeams } from './types';

const API_URL = 'https://api.football-data.org/v4';

// This function is now flexible and accepts the competition code as per the documentation
export async function fetchFixtures(competitionCode: string, season: number) {
  // DIAGNOSTIC STEP: Hardcode the API key to bypass any .env loading issues.
  const apiKey = 'a938377027ec4af3bba0ae5a3ba19064';
  console.log('🔍 fetchFixtures ÇAĞRILDI:', { competitionCode, season });
  console.log('🔑 API Key (hardcoded) var mı?', !!apiKey);

  if (!apiKey) {
    console.error('CRITICAL: API anahtarı eksik.');
    throw new Error('FOOTBALL_DATA_API_KEY is not defined');
  }

  const endpoint = `competitions/${competitionCode}/matches?season=${season}`;
  const requestUrl = `${API_URL}/${endpoint}`;
  console.log(`[API] Fetching from API: ${requestUrl}`);

  const response = await fetch(requestUrl, {
    headers: {
      'X-Auth-Token': apiKey,
    },
    cache: 'no-store'
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`[API] API call failed for endpoint: ${endpoint}. Status: ${response.status}.`);
    console.error(`[API] Response: ${JSON.stringify(data)}`);
    const errorMessage = data.message || `API call failed for endpoint: ${endpoint}`;
    throw new Error(errorMessage);
  }
  
  console.log(`[API] Successfully fetched data for ${competitionCode} season ${season}. Found ${data.matches?.length || 0} matches.`);

  return data;
};

export async function fetchUpcomingFixtures(competitionCode: string) {
  const apiKey = 'a938377027ec4af3bba0ae5a3ba19064';
  if (!apiKey) {
    throw new Error('FOOTBALL_DATA_API_KEY is not defined in .env');
  }

  const toISO = (date: Date) => date.toISOString().split('T')[0];
  const dateFrom = new Date();
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 3);

  const endpoint = `competitions/${competitionCode}/matches?dateFrom=${toISO(dateFrom)}&dateTo=${toISO(dateTo)}`;
  console.log(`Fetching upcoming from API: ${API_URL}/${endpoint}`);

  const response = await fetch(`${API_URL}/${endpoint}`, {
    headers: {
      'X-Auth-Token': apiKey,
    },
    cache: 'no-store'
  });

  const data = await response.json();
  if (!response.ok) {
    console.error(`API call failed: ${response.status}`);
    throw new Error(data.message || `API call failed`);
  }

  return data;
}


// Helper to find or create teams and return their DB IDs
async function getTeamIds(homeTeamAPI: any, awayTeamAPI: any, leagueId: number): Promise<{ homeTeamId: number, awayTeamId: number }> {
    // Upsert Home Team
    await db.insert(schema.teams)
        .values({
            id: homeTeamAPI.id,
            name: homeTeamAPI.name,
            league_id: leagueId,
            logoUrl: homeTeamAPI.crest,
        })
        .onConflictDoUpdate({
            target: schema.teams.id,
            set: { name: homeTeamAPI.name, league_id: leagueId, logoUrl: homeTeamAPI.crest }
        });

    // Upsert Away Team
    await db.insert(schema.teams)
        .values({
            id: awayTeamAPI.id,
            name: awayTeamAPI.name,
            league_id: leagueId,
            logoUrl: awayTeamAPI.crest,
        })
        .onConflictDoUpdate({
            target: schema.teams.id,
            set: { name: awayTeamAPI.name, league_id: leagueId, logoUrl: awayTeamAPI.crest }
        });

    return { homeTeamId: homeTeamAPI.id, awayTeamId: awayTeamAPI.id };
}

export async function mapAndUpsertFixtures(fixturesResponse: any) {
    console.log('📝 mapAndUpsertFixtures BAŞLADI');
    console.log('📊 Gelen veri:', fixturesResponse?.matches?.length, 'maç');
    const fixtures = fixturesResponse.matches;

    if (!fixtures || !Array.isArray(fixtures)) {
        console.warn("[DB] mapAndUpsertFixtures received a response with no 'matches' array or it's not an array.");
        return 0;
    }

    let count = 0;
    for (const match of fixtures) {
        if (!match.competition?.id || !match.competition?.name || !match.area?.name) {
            console.warn(`[DB] Skipping match ${match.id} due to missing competition or area data.`);
            continue;
        }
        await processMatch(match);
        count++;
    }
    console.log('✅ Toplam işlenen maç:', count);
    return count;
}

async function processMatch(match: any) {
    console.log('🎯 processMatch başladı - Match ID:', match.id);
    if (!match.homeTeam?.id || !match.awayTeam?.id || !match.homeTeam?.name || !match.awayTeam?.name) {
        console.warn(`⚠️ Skipping match ${match.id} due to missing team data.`);
        return;
    }
    console.log('📝 Takımlar:', match.homeTeam.name, 'vs', match.awayTeam.name);

    await db.insert(schema.leagues)
      .values({
          id: match.competition.id,
          name: match.competition.name,
          country: match.area.name,
      })
      .onConflictDoNothing();

    const { homeTeamId, awayTeamId } = await getTeamIds(match.homeTeam, match.awayTeam, match.competition.id);
    
    let status;
    switch (match.status) {
        case 'FINISHED': status = 'FT'; break;
        case 'SCHEDULED': case 'TIMED': status = 'NS'; break;
        case 'IN_PLAY': status = 'LIVE'; break;
        case 'PAUSED': status = 'HT'; break;
        case 'POSTPONED': status = 'PST'; break;
        case 'SUSPENDED': status = 'SUS'; break;
        case 'CANCELED': status = 'CANC'; break;
        case 'AWARDED': status = 'AWD'; break;
        default: status = match.status;
    }

    const matchData = {
        api_fixture_id: match.id,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: new Date(match.utcDate),
        home_score: match.score?.fullTime?.home,
        away_score: match.score?.fullTime?.away,
        status: status,
    };

    await db.insert(schema.matches)
        .values(matchData)
        .onConflictDoUpdate({
            target: schema.matches.api_fixture_id,
            set: {
                home_score: matchData.home_score,
                away_score: matchData.away_score,
                status: matchData.status,
                match_date: matchData.match_date,
            }
        });
    console.log('✅ Match kaydedildi:', match.id);
}


export async function analyzeMatches() {
    const matchesToAnalyze = await db.query.matches.findMany({
        where: and(
            eq(schema.matches.status, 'NS'),
            isNull(schema.matches.confidence)
        ),
         with: {
            homeTeam: true,
            awayTeam: true
        }
    });

    if (matchesToAnalyze.length === 0) {
        console.log("[ANALYSIS] No new matches to analyze.");
        return 0; 
    }
    
    console.log(`[ANALYSIS] Found ${matchesToAnalyze.length} matches to analyze.`);

    for (const match of matchesToAnalyze) {
        if (!match.homeTeam || !match.awayTeam) {
            console.warn(`[ANALYSIS] Skipping analysis for match ID ${match.id} due to missing team data.`);
            continue;
        }

        try {
            console.log(`[ANALYSIS] 🔬 Analyzing match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
            const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:9002';
            const response = await fetch(`${host}/api/ai-predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    homeTeam: match.homeTeam.name,
                    awayTeam: match.awayTeam.name,
                    homeId: match.home_team_id,
                    awayId: match.away_team_id,
                    league: "Premier League", // Simplified for now
                }),
                cache: 'no-store'
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `AI Predict API failed with status ${response.status}`);
            }

            const predictionResult = await response.json();
            const { mathAnalysis } = predictionResult;

            await db.update(schema.matches)
                .set({
                    home_win_prob: mathAnalysis.home_win,
                    draw_prob: mathAnalysis.draw,
                    away_win_prob: mathAnalysis.away_win,
                    predicted_score: mathAnalysis.score_prediction,
                    confidence: mathAnalysis.confidence,
                })
                .where(eq(schema.matches.id, match.id));
            console.log(`[ANALYSIS] ✅ Successfully analyzed match ID: ${match.id}`);
        } catch(error: any) {
            console.error(`[ANALYSIS] ❌ Failed to analyze match ID ${match.id}:`, error.message);
        }
    }
    
    return matchesToAnalyze.length;
}



