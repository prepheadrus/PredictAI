import { NextResponse, type NextRequest } from 'next/server';
import { fetchFixtures, mapAndUpsertFixtures } from '@/lib/api-football';

// Default values - Using Premier League code for football-data.org
const DEFAULT_LEAGUE_CODE = 'PL';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const leagueCode = searchParams.get('leagueCode') || DEFAULT_LEAGUE_CODE;

  try {
    console.log(`Fetching fixtures for league ${leagueCode}...`);
    const fixturesResponse = await fetchFixtures(leagueCode);

    if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
      return NextResponse.json({ message: `No fixtures found for league ${leagueCode}.` });
    }

    console.log(`Upserting ${fixturesResponse.matches.length} fixtures into the database...`);
    const count = await mapAndUpsertFixtures(fixturesResponse);

    return NextResponse.json({ message: 'Ingestion complete', processed: count, leagueCode: leagueCode });

  } catch (error: any) {
    console.error('Ingestion failed:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during ingestion.' },
      { status: 500 }
    );
  }
}
