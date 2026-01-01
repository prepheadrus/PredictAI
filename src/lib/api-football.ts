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
    console.error(await response.text());
    throw new Error(`API call failed for endpoint: ${endpoint}`);
  }

  const data = await response.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error('API Errors:', data.errors);
    throw new Error(`API returned errors: ${JSON.stringify(data.errors)}`);
  }
  return data.response;
};

export async function getFixtures(leagueId: number, season: number) {
  return apiFetch(`fixtures?league=${leagueId}&season=${season}`);
}

export async function getOdds(fixtureId: number) {
    // Note: API-Football has different plans. We'll use a common bookmaker (e.g., Bet365 - id 8)
    return apiFetch(`odds?fixture=${fixtureId}&bookmaker=8`);
}

// Helper to find or create teams and return their DB IDs
async function getTeamIds(homeTeamName: string, awayTeamName: string, leagueId: number): Promise<{ homeTeamId: number, awayTeamId: number }> {
    let homeTeam = await db.query.teams.findFirst({ where: eq(schema.teams.name, homeTeamName) });
    if (!homeTeam) {
        const [newTeam] = await db.insert(schema.teams).values({ name: homeTeamName, league_id: leagueId }).returning();
        homeTeam = newTeam;
    }

    let awayTeam = await db.query.teams.findFirst({ where: eq(schema.teams.name, awayTeamName) });
    if (!awayTeam) {
        const [newTeam] = await db.insert(schema.teams).values({ name: awayTeamName, league_id: leagueId }).returning();
        awayTeam = newTeam;
    }

    return { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id };
}

export async function mapAndUpsertFixtures(fixtures: any[], oddsData: any[]) {
    const oddsMap = new Map(oddsData.map(o => [o.fixture.id, o.bookmakers[0]?.bets[0]?.values]));

    for (const fixtureData of fixtures) {
        const { fixture, teams: apiTeams, goals, league } = fixtureData;
        const odds = oddsMap.get(fixture.id);

        const { homeTeamId, awayTeamId } = await getTeamIds(apiTeams.home.name, apiTeams.away.name, league.id);
        
        const matchData = {
            fixture_id: fixture.id,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_date: new Date(fixture.date),
            home_score: goals.home,
            away_score: goals.away,
            status: fixture.status.short,
            home_odd: odds?.find((o: any) => o.value === 'Home')?.odd,
            draw_odd: odds?.find((o: any) => o.value === 'Draw')?.odd,
            away_odd: odds?.find((o: any) => o.value === 'Away')?.odd,
        };

        await db.insert(schema.matches)
            .values(matchData)
            .onConflictDoUpdate({
                target: schema.matches.fixture_id,
                set: {
                    ...matchData,
                    // id is not updated
                    id: undefined
                }
            });
    }

    return fixtures.length;
}
