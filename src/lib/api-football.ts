
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

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
  });

  const data = await response.json();
  if (!response.ok) {
    console.error(`API call failed for endpoint: ${endpoint}. Response: ${JSON.stringify(data)}`);
    const errorMessage = data.message || `API call failed for endpoint: ${endpoint}`;
    // The API sometimes puts the error in an 'error' property
    const detailedError = data.error ? JSON.stringify(data.error) : '';
    throw new Error(`${errorMessage} ${detailedError}`);
  }

  return data;
};

export async function fetchFixtures(leagueCode: string, season: string) {
    // Premier League has code PL
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
    const { matches, competition } = fixturesResponse;
    if (!competition) {
        throw new Error("Competition data is missing from the API response.");
    }
    
    // Upsert League
    await db.insert(schema.leagues)
        .values({
            id: competition.id,
            name: competition.name,
            country: competition.area.name,
        })
        .onConflictDoUpdate({
            target: schema.leagues.id,
            set: { name: competition.name, country: competition.area.name }
        });

    let count = 0;
    for (const match of matches) {
        // Skip if team data is incomplete
        if (!match.homeTeam?.id || !match.awayTeam?.id) {
            console.warn(`Skipping match ${match.id} due to missing team ID.`);
            continue;
        }

        const { homeTeamId, awayTeamId } = await getTeamIds(match.homeTeam, match.awayTeam, competition.id);
        
        let status;
        switch (match.status) {
            case 'FINISHED':
                status = 'FT';
                break;
            case 'SCHEDULED':
                status = 'NS';
                break;
            case 'TIMED':
                status = 'NS';
                break;
            case 'IN_PLAY':
                status = 'LIVE';
                break;
             case 'PAUSED':
                status = 'HT';
                break;
            default:
                status = match.status; // Keep original status if not mappable
        }

        const matchData = {
            api_fixture_id: match.id,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_date: new Date(match.utcDate),
            home_score: match.score.fullTime.home,
            away_score: match.score.fullTime.away,
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
        count++;
    }

    return count;
}
