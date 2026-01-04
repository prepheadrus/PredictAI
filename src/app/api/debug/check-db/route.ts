import { NextResponse } from 'next/server';
import { db } from '@/db';
import { matches, teams, leagues } from '@/db/schema';
import { count, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Count total matches
    const totalMatchesResult = await db.select({ value: count() }).from(matches);
    const totalMatches = totalMatchesResult[0].value;

    // 2. Count total teams
    const totalTeamsResult = await db.select({ value: count() }).from(teams);
    const totalTeams = totalTeamsResult[0].value;

    // 3. Count total leagues
    const totalLeaguesResult = await db.select({ value: count() }).from(leagues);
    const totalLeagues = totalLeaguesResult[0].value;

    // 4. Get the last 3 matches
    const lastThreeMatches = await db.query.matches.findMany({
      orderBy: [desc(matches.id)],
      limit: 5,
      with: {
        homeTeam: true,
        awayTeam: true,
      }
    });

    return NextResponse.json({
      message: 'Database Check Successful',
      totalMatches,
      totalTeams,
      totalLeagues,
      lastFiveMatches: lastThreeMatches,
    });

  } catch (error: any) {
    console.error('Debug Check DB Error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to check database.',
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
