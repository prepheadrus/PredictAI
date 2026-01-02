import { NextResponse, type NextRequest } from 'next/server';

const API_URL = 'https://api.football-data.org/v4';

const apiFetch = async (endpoint: string, apiKey: string) => {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    headers: {
      'X-Auth-Token': apiKey,
    },
    cache: 'no-store' // Use no-store for real-time data
  });

  const data = await response.json();
  if (!response.ok) {
    console.error(`API call failed for endpoint: ${endpoint}. Response: ${JSON.stringify(data)}`);
    throw new Error(data.message || `API call failed with status: ${response.status}`);
  }
  return data;
};

export async function GET(request: NextRequest) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is not configured.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const leagueCode = searchParams.get('leagueCode');

  if (!leagueCode) {
    return NextResponse.json({ error: 'League code is required.' }, { status: 400 });
  }

  try {
    // Fetch standings and matches in parallel
    const [standings, matches] = await Promise.all([
      apiFetch(`competitions/${leagueCode}/standings`, apiKey),
      apiFetch(`competitions/${leagueCode}/matches?status=SCHEDULED`, apiKey), // Fetch scheduled matches
    ]);

    return NextResponse.json({ standings, matches: matches.matches });

  } catch (error: any) {
    console.error('League status fetch failed:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
