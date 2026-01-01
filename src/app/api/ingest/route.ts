import { NextResponse, type NextRequest } from 'next/server';

const API_URL = 'https://api.football-data.org/v4';

const apiFetch = async (endpoint: string) => {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('FOOTBALL_DATA_API_KEY is not defined in .env');
  }

  const response = await fetch(`${API_URL}/${endpoint}`, {
    headers: {
      'X-Auth-Token': apiKey,
    },
    cache: 'no-store' // Ensure fresh data on every request
  });

  const data = await response.json();
  if (!response.ok) {
    console.error(`API call failed for endpoint: ${endpoint}. Response: ${JSON.stringify(data)}`);
    const errorMessage = data.message || `API call failed for endpoint: ${endpoint}`;
    throw new Error(errorMessage);
  }

  return data;
};


export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0];

    // KULLANICININ HESABINDA AKTİF OLAN LİGLER
    // PL: İngiltere, PD: İspanya, SA: İtalya, BL1: Almanya, FL1: Fransa, CL: Şampiyonlar Ligi, DED: Hollanda, PPL: Portekiz
    const competitions = "PL,PD,SA,BL1,FL1,CL,DED,PPL";
      
    console.log(`Fetching fixtures from ${today} to ${endDate} for competitions: ${competitions}`);
    const fixturesResponse = await apiFetch(`matches?dateFrom=${today}&dateTo=${endDate}&competitions=${competitions}`);

    if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
      return NextResponse.json({ message: `No fixtures found for competitions ${competitions}.`, matches: [] });
    }

    return NextResponse.json({ message: 'Fetch complete', matches: fixturesResponse.matches });

  } catch (error: any) {
    console.error('Ingestion failed:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during ingestion.' },
      { status: 500 }
    );
  }
}
