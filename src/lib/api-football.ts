
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, isNull, and, sql, asc } from 'drizzle-orm';
import type { MatchWithTeams } from './types';

const API_URL = 'https://api.football-data.org/v4';

// This function is now flexible and accepts the competition code as per the documentation
export async function fetchFixtures(competitionCode: string, season: number) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey || apiKey === 'your_actual_api_key_here') {
    console.error('API anahtarı eksik veya ayarlanmamış. Lütfen .env dosyasını kontrol edin.');
    throw new Error('FOOTBALL_DATA_API_KEY is not defined in .env');
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
  console.log(`[API] Raw data received:`, JSON.stringify(data, null, 2));


  return data;
};


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
    const fixtures = fixturesResponse.matches;

    if (!fixtures || !Array.isArray(fixtures)) {
        console.warn("[DB] mapAndUpsertFixtures received a response with no 'matches' array or it's not an array.");
        return 0;
    }

    let count = 0;
    for (const match of fixtures) {
        if (!match.competition?.id || !match.competition?.name || !match.competition?.area?.name) {
            console.warn(`[DB] Skipping match ${match.id} due to missing competition data.`);
            continue;
        }
        await processMatch(match, match.competition);
        count++;
    }
    return count;
}

async function processMatch(match: any, competition: any) {
    if (!match.homeTeam?.id || !match.awayTeam?.id || !match.homeTeam?.name || !match.awayTeam?.name) {
        console.warn(`[DB] Skipping match ${match.id} due to missing team data.`);
        return;
    }

    await db.insert(schema.leagues)
      .values({
          id: competition.id,
          name: competition.name,
          country: competition.area.name,
      })
      .onConflictDoNothing();

    const { homeTeamId, awayTeamId } = await getTeamIds(match.homeTeam, match.awayTeam, competition.id);
    
    let status;
    switch (match.status) {
        case 'FINISHED': status = 'FT'; break;
        case 'SCHEDULED': case 'TIMED': status = 'NS'; break;
        case 'IN_PLAY': status = 'LIVE'; break;
        case 'PAUSED': status = 'HT'; break;
        case 'POSTPONED': status = 'PST'; break;
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

        const home_win_prob = Math.random() * (50 - 30) + 30;
        let away_win_prob = Math.random() * (40 - 20) + 20;
        let draw_prob = 100 - home_win_prob - away_win_prob;

        if (draw_prob < 10) {
            away_win_prob -= (10 - draw_prob)
            draw_prob = 10;
        }
        const total_prob = home_win_prob + away_win_prob + draw_prob;
        const final_home_prob = (home_win_prob/total_prob) * 100;
        const final_away_prob = (away_win_prob/total_prob) * 100;
        const final_draw_prob = (draw_prob/total_prob) * 100;

        const confidence = Math.random() * (90 - 60) + 60;

        let predicted_score = "1-1";
        if (final_home_prob > final_away_prob + 10) {
             predicted_score = Math.random() > 0.5 ? "2-1" : "1-0";
        } else if (final_away_prob > final_home_prob + 10) {
             predicted_score = Math.random() > 0.5 ? "1-2" : "0-1";
        }

        await db.update(schema.matches)
            .set({
                home_win_prob: parseFloat(final_home_prob.toFixed(1)),
                away_win_prob: parseFloat(final_away_prob.toFixed(1)),
                draw_prob: parseFloat(final_draw_prob.toFixed(1)),
                confidence: parseFloat(confidence.toFixed(1)),
                predicted_score: predicted_score,
            })
            .where(eq(schema.matches.id, match.id));
    }
    
    return matchesToAnalyze.length;
}
