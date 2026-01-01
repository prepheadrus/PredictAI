
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

const API_URL = 'https://v3.football.api-sports.io';

const apiFetch = async (endpoint: string) => {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    throw new Error('FOOTBALL_API_KEY is not defined in .env');
  }

  const response = await fetch(`${API_URL}/${endpoint}`, {
    headers: {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API call failed for endpoint: ${endpoint}. Response: ${errorText}`);
    throw new Error(`API call failed for endpoint: ${endpoint}`);
  }

  const data = await response.json();
  if (data.errors && Object.keys(data.errors).length > 0 && JSON.stringify(data.errors) !== '[]') {
    console.error('API Errors:', data.errors);
    throw new Error(`API returned errors: ${JSON.stringify(data.errors)}`);
  }
  return data.response;
};

export async function fetchFixtures(leagueId: number, season: number) {
  return apiFetch(`fixtures?league=${leagueId}&season=${season}`);
}

export async function getOdds(fixtureId: number) {
    // Note: API-Football has different plans. We'll use a common bookmaker (e.g., Bet365 - id 8)
    return apiFetch(`odds?fixture=${fixtureId}&bookmaker=8`);
}

// Helper to find or create teams and return their DB IDs
async function getTeamIds(homeTeamAPI: any, awayTeamAPI: any, leagueAPI: any): Promise<{ homeTeamId: number, awayTeamId: number }> {
    
    // Upsert League
    await db.insert(schema.leagues)
        .values({
            id: leagueAPI.id,
            name: leagueAPI.name,
            country: leagueAPI.country,
        })
        .onConflictDoUpdate({
            target: schema.leagues.id,
            set: { name: leagueAPI.name, country: leagueAPI.country }
        });

    // Upsert Home Team
    await db.insert(schema.teams)
        .values({
            id: homeTeamAPI.id,
            name: homeTeamAPI.name,
            league_id: leagueAPI.id,
            logoUrl: homeTeamAPI.logo,
        })
        .onConflictDoUpdate({
            target: schema.teams.id,
            set: { name: homeTeamAPI.name, league_id: leagueAPI.id, logoUrl: homeTeamAPI.logo }
        });

    // Upsert Away Team
    await db.insert(schema.teams)
        .values({
            id: awayTeamAPI.id,
            name: awayTeamAPI.name,
            league_id: leagueAPI.id,
            logoUrl: awayTeamAPI.logo,
        })
        .onConflictDoUpdate({
            target: schema.teams.id,
            set: { name: awayTeamAPI.name, league_id: leagueAPI.id, logoUrl: awayTeamAPI.logo }
        });

    return { homeTeamId: homeTeamAPI.id, awayTeamId: awayTeamAPI.id };
}

export async function mapAndUpsertFixtures(fixtures: any[]) {
    let count = 0;
    for (const fixtureData of fixtures) {
        const { fixture, teams: apiTeams, goals, league } = fixtureData;

        // Skip if team data is incomplete
        if (!apiTeams.home?.id || !apiTeams.away?.id) {
            console.warn(`Skipping fixture ${fixture.id} due to missing team ID.`);
            continue;
        }

        // Ensure teams and league exist before creating match
        const { homeTeamId, awayTeamId } = await getTeamIds(apiTeams.home, apiTeams.away, league);
        
        const matchData = {
            api_fixture_id: fixture.id,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_date: new Date(fixture.date),
            home_score: goals.home,
            away_score: goals.away,
            status: fixture.status.short,
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
