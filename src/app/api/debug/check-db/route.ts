import { NextResponse } from 'next/server';
import { db } from '@/db';
import { matches } from '@/db/schema';
import { count, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Count total matches
    const totalMatchesResult = await db.select({ value: count() }).from(matches);
    const totalMatches = totalMatchesResult[0].value;

    // 2. Get the last 3 matches
    const lastThreeMatches = await db.query.matches.findMany({
      orderBy: [desc(matches.id)],
      limit: 3,
      with: {
        homeTeam: true,
        awayTeam: true,
      }
    });

    return NextResponse.json({
      message: 'Database Check Successful',
      totalMatches,
      lastThreeMatches,
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
