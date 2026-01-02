
import { NextResponse, type NextRequest } from 'next/server';

const API_URL = 'https://api.football-data.org/v4';

const apiFetch = async (endpoint: string, apiKey: string) => {
  // Use a short revalidation time for historical data as it won't change often
  const response = await fetch(`${API_URL}/${endpoint}`, {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 3600 * 24 } // Revalidate once a day
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
    const currentYear = new Date().getFullYear();
    const seasons = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i).reverse(); // Last 5 completed seasons
    
    const historicalData = await Promise.all(
        seasons.map(async (season) => {
            try {
                const data = await apiFetch(`competitions/${leagueCode}/matches?season=${season}&status=FINISHED`, apiKey);
                const matches = data.matches || [];
                
                let homeWins = 0;
                let decidedMatches = 0; // Excludes draws

                for (const match of matches) {
                    if (match.score?.winner) {
                        if(match.score.winner === 'HOME_TEAM') {
                            homeWins++;
                            decidedMatches++;
                        } else if (match.score.winner === 'AWAY_TEAM') {
                            decidedMatches++;
                        }
                    }
                }
                
                const homeWinPercentage = decidedMatches > 0 ? (homeWins / decidedMatches) * 100 : 0;
                
                return {
                    season: season.toString(),
                    "Home Win %": parseFloat(homeWinPercentage.toFixed(1))
                };

            } catch (error) {
                console.warn(`Could not fetch data for season ${season} of ${leagueCode}`);
                return { season: season.toString(), "Home Win %": 0 }; // Return 0 if a season fails
            }
        })
    );

    return NextResponse.json(historicalData.filter(d => d["Home Win %"] > 0)); // Filter out seasons with no data

  } catch (error: any) {
    console.error('Historical stats fetch failed:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
