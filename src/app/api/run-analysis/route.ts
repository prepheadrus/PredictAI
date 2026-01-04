import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

// This function is a wrapper to call the ai-predict API internally
async function getPredictionForMatch(match: any) {
    // We need to construct the full URL for the internal API route
    const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:9002';
    const response = await fetch(`${host}/api/ai-predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeId: match.homeTeam.id,
            awayId: match.awayTeam.id,
            league: "Premier League", // The primary league we are tracking
        }),
        cache: 'no-store'
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || `AI Predict API failed with status ${response.status}`);
    }
    return result;
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId } = body;

    if (!matchId) {
        return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // 1. Fetch the match from the database
    const match = await db.query.matches.findFirst({
        where: eq(schema.matches.id, matchId),
        with: {
            homeTeam: true,
            awayTeam: true
        }
    });

    if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    if (!match.homeTeam || !match.awayTeam) {
        return NextResponse.json({ error: 'Match is missing team data' }, { status: 400 });
    }

    // 2. Call the analysis service
    const predictionResult = await getPredictionForMatch(match);
    const { mathAnalysis } = predictionResult;

    // 3. Update the match in the database with the analysis results
    const [updatedMatch] = await db.update(schema.matches)
        .set({
            home_win_prob: mathAnalysis.home_win,
            draw_prob: mathAnalysis.draw,
            away_win_prob: mathAnalysis.away_win,
            predicted_score: mathAnalysis.score_prediction,
            confidence: mathAnalysis.confidence,
        })
        .where(eq(schema.matches.id, matchId))
        .returning();

    return NextResponse.json({ message: 'Analysis complete and saved', updatedMatch });

  } catch (error: any) {
    console.error('Run Analysis Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during analysis.' },
      { status: 500 }
    );
  }
}
