import { NextResponse } from 'next/server';
import { getFixtures, getOdds, mapAndUpsertFixtures } from '@/lib/api-football';

// Example: Premier League ID = 39, Season = 2023
const LEAGUE_ID = 39;
const SEASON = 2023;

export async function GET() {
  try {
    console.log(`Fetching fixtures for league ${LEAGUE_ID} and season ${SEASON}...`);
    const fixtures = await getFixtures(LEAGUE_ID, SEASON);

    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ message: 'No fixtures found to update.' });
    }

    // For simplicity, we fetch odds for all fixtures at once if the API allows.
    // In a real-world scenario, you might need to paginate or batch these requests.
    const fixtureIds = fixtures.map((f: any) => f.fixture.id);
    
    // The free plan for API-Football might have rate limits.
    // We'll fetch odds for the first 20 fixtures as an example.
    const oddsPromises = fixtureIds.slice(0, 20).map((id: number) => getOdds(id));
    const oddsResults = await Promise.all(oddsPromises);
    const oddsData = oddsResults.flat().filter(Boolean); // Filter out any null/undefined results

    console.log(`Upserting ${fixtures.length} fixtures into the database...`);
    const count = await mapAndUpsertFixtures(fixtures, oddsData);

    return NextResponse.json({ message: 'Sync complete', count });

  } catch (error: any) {
    console.error('Sync failed:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during sync.' },
      { status: 500 }
    );
  }
}
