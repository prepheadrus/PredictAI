
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, isNull, and, sql } from 'drizzle-orm';

const API_URL = 'https://api.football-data.org/v4';

const apiFetch = async (endpoint: string) => {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('FOOTBALL_DATA_API_KEY is not defined in .env');
  }

  const response = await fetch(`${API_URL}/${endpoint}`, {
    headers: {
      'X-Auth-Token': apiKey,
    },
    cache: 'no-store', // Always fetch fresh data during ingestion
  });

  const data = await response.json();
  if (!response.ok) {
    console.error(`API call failed for endpoint: ${endpoint}. Response: ${JSON.stringify(data)}`);
    const errorMessage = data.message || `API call failed for endpoint: ${endpoint}`;
    const detailedError = data.error ? JSON.stringify(data.error) : (data.errors ? JSON.stringify(data.errors) : '');
    throw new Error(`${errorMessage} ${detailedError}`);
  }

  return data;
};

export async function fetchFixtures(leagueCode: string, season: number) {
  // Use the competitions endpoint for a specific league and season
  return apiFetch(`competitions/${leagueCode}/matches?season=${season}`);
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
    const { matches } = fixturesResponse;

    if (!matches) {
        console.warn("mapAndUpsertFixtures received a response with no 'matches' array.");
        return 0;
    }

    let count = 0;
    for (const match of matches) {
        if (!match.competition?.id || !match.competition?.name || !match.competition?.area?.name) {
            console.warn(`Skipping match ${match.id} due to missing competition data.`);
            continue;
        }
        await processMatch(match, match.competition);
        count++;
    }
    return count;
}

async function processMatch(match: any, competition: any) {
    // Skip if team data is incomplete
    if (!match.homeTeam?.id || !match.awayTeam?.id || !match.homeTeam?.name || !match.awayTeam?.name) {
        console.warn(`Skipping match ${match.id} due to missing team data.`);
        return;
    }

    // Upsert the league for this specific match just in case
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
        case 'FINISHED':
            status = 'FT';
            break;
        case 'SCHEDULED':
        case 'TIMED':
            status = 'NS';
            break;
        case 'IN_PLAY':
            status = 'LIVE';
            break;
         case 'PAUSED':
            status = 'HT';
            break;
        case 'POSTPONED':
            status = 'PST';
            break;
        default:
            status = match.status;
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
        return 0; // No new matches to analyze
    }

    for (const match of matchesToAnalyze) {
        // Basic check to ensure teams data is present
        if (!match.homeTeam || !match.awayTeam) {
            console.warn(`Skipping analysis for match ID ${match.id} due to missing team data.`);
            continue;
        }

        const home_win_prob = Math.random() * (50 - 30) + 30; // 30-50%
        const away_win_prob = Math.random() * (50 - 30) + 30; // 30-50%
        const draw_prob = 100 - home_win_prob - away_win_prob;
        const confidence = Math.random() * (90 - 60) + 60; // 60-90%

        let predicted_score = "1-1";
        if (home_win_prob > away_win_prob + 5) {
             predicted_score = Math.random() > 0.5 ? "2-1" : "1-0";
        } else if (away_win_prob > home_win_prob + 5) {
             predicted_score = Math.random() > 0.5 ? "1-2" : "0-1";
        }

        await db.update(schema.matches)
            .set({
                home_win_prob: parseFloat(home_win_prob.toFixed(1)),
                away_win_prob: parseFloat(away_win_prob.toFixed(1)),
                draw_prob: parseFloat(draw_prob.toFixed(1)),
                confidence: parseFloat(confidence.toFixed(1)),
                predicted_score: predicted_score,
            })
            .where(eq(schema.matches.id, match.id));
    }
    
    return matchesToAnalyze.length;
}

