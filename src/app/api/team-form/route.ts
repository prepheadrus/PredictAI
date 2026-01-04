'use server';

import { NextResponse, type NextRequest } from 'next/server';

const API_URL = 'https://api.football-data.org/v4';
const FOOTBALL_API_KEY = 'a938377027ec4af3bba0ae5a3ba19064';

interface FormResult {
  result: "W" | "D" | "L";
  opponentName: string;
  score: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'Team ID is required.' }, { status: 400 });
  }

  if (!FOOTBALL_API_KEY) {
    console.error('CRITICAL: API Key is missing in team-form route.');
    return NextResponse.json({ error: 'API key is not configured on the server.' }, { status: 500 });
  }

  try {
    const endpoint = `teams/${teamId}/matches?status=FINISHED&limit=5`;
    const response = await fetch(`${API_URL}/${endpoint}`, {
        headers: { 'X-Auth-Token': FOOTBALL_API_KEY },
        cache: 'no-store',
    });

    const data = await response.json();
    if (!response.ok) {
        console.error(`API call failed for endpoint: ${endpoint}. Response: ${JSON.stringify(data)}`);
        throw new Error(data.message || `API call failed for ${endpoint}`);
    }
    
    if (!data.matches || data.matches.length === 0) {
      return NextResponse.json([]);
    }

    const form: FormResult[] = data.matches.map((match: any) => {
        let result: "W" | "D" | "L";
        const homeScore = match.score.fullTime.home;
        const awayScore = match.score.fullTime.away;
        const isHomeTeam = match.homeTeam.id.toString() === teamId;

        if (homeScore === awayScore) {
            result = "D";
        } else if ((isHomeTeam && homeScore > awayScore) || (!isHomeTeam && awayScore > homeScore)) {
            result = "W";
        } else {
            result = "L";
        }

        return {
            result,
            opponentName: isHomeTeam ? match.awayTeam.name : match.homeTeam.name,
            score: `${homeScore} - ${awayScore}`,
        };
    });

    return NextResponse.json(form.reverse()); // API son maçı ilk veriyor, biz tersini alıyoruz.

  } catch (error: any) {
    console.error(`Failed to fetch form for team ${teamId}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
