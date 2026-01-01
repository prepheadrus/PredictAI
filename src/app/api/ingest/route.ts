import { NextResponse, type NextRequest } from 'next/server';
import { fetchFixtures, mapAndUpsertFixtures } from '@/lib/api-football';

// Default values
const DEFAULT_LEAGUE_ID = 39; // Premier League
const DEFAULT_SEASON = 2025; // Corresponds to 2025-2026 season

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const leagueId = Number(searchParams.get('leagueId')) || DEFAULT_LEAGUE_ID;
  const season = Number(searchParams.get('season')) || DEFAULT_SEASON;

  try {
    console.log(`Fetching fixtures for league ${leagueId} and season ${season}...`);
    const fixtures = await fetchFixtures(leagueId, season);

    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ message: `No fixtures found for league ${leagueId}, season ${season}.` });
    }

    console.log(`Upserting ${fixtures.length} fixtures into the database...`);
    const count = await mapAndUpsertFixtures(fixtures);

    return NextResponse.json({ message: 'Ingestion complete', processed: count, season: season, leagueId: leagueId });

  } catch (error: any) {
    console.error('Ingestion failed:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during ingestion.' },
      { status: 500 }
    );
  }
}
