import { NextResponse, type NextRequest } from 'next/server';
import { fetchFixtures, mapAndUpsertFixtures } from '@/lib/api-football';

// Default values - Using Premier League code for football-data.org
const DEFAULT_LEAGUE_CODE = 'PL';
const DEFAULT_SEASON = '2024';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const leagueCode = searchParams.get('leagueCode') || DEFAULT_LEAGUE_CODE;
  const season = searchParams.get('season') || DEFAULT_SEASON;

  try {
    console.log(`Fetching fixtures for league ${leagueCode} in season ${season}...`);
    const fixturesResponse = await fetchFixtures(leagueCode, season);

    if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
      return NextResponse.json({ message: `No fixtures found for league ${leagueCode} in season ${season}.` });
    }

    console.log(`Upserting ${fixturesResponse.matches.length} fixtures into the database...`);
    const count = await mapAndUpsertFixtures(fixturesResponse);

    return NextResponse.json({ message: 'Ingestion complete', processed: count, leagueCode: leagueCode, season: season });

  } catch (error: any) {
    console.error('Ingestion failed:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during ingestion.' },
      { status: 500 }
    );
  }
}
