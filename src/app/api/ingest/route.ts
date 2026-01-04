import { NextResponse, type NextRequest } from 'next/server';
import { mapAndUpsertFixtures } from '@/lib/api-football';

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
    cache: 'no-store'
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
    // KULLANICININ HESABINDA AKTİF OLAN TÜM LİGLER
    // PL, PD, SA, BL1, FL1, CL, DED, PPL, ELC, BSA
    const competitions = "PL,PD,SA,BL1,FL1,CL,DED,PPL,ELC,BSA";
      
    console.log(`Fetching fixtures for competitions: ${competitions}`);
    // Not: dateFrom ve dateTo kaldırıldı, böylece API mevcut sezon için yaklaşan maçları döndürür.
    const fixturesResponse = await apiFetch(`matches?competitions=${competitions}`);

    if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
      return NextResponse.json({ message: `No fixtures found for competitions ${competitions}.`, processed: 0, matches: [] });
    }
    
    // Fetch edilen veriyi veritabanına işle
    const processedCount = await mapAndUpsertFixtures(fixturesResponse);

    return NextResponse.json({ message: 'Ingestion complete', processed: processedCount, matches: fixturesResponse.matches });

  } catch (error: any) {
    console.error('Ingestion failed:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during ingestion.' },
      { status: 500 }
    );
  }
}
