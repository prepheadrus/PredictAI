import { NextResponse } from 'next/server';
import { fetchFixtures, mapAndUpsertFixtures } from '@/lib/api-football';

// Example: Premier League ID = 39, Season = 2023
const LEAGUE_ID = 39;
const SEASON = 2023;

export async function GET() {
  try {
    console.log(`Fetching fixtures for league ${LEAGUE_ID} and season ${SEASON}...`);
    const fixtures = await fetchFixtures(LEAGUE_ID, SEASON);

    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ message: 'No fixtures found to ingest.' });
    }

    console.log(`Upserting ${fixtures.length} fixtures into the database...`);
    const count = await mapAndUpsertFixtures(fixtures);

    return NextResponse.json({ message: 'Ingestion complete', processed: count });

  } catch (error: any) {
    console.error('Ingestion failed:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during ingestion.' },
      { status: 500 }
    );
  }
}
