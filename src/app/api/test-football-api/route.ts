import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  
  console.log('🔑 API Key exists:', !!apiKey);
  console.log('🔑 API Key first 10 chars:', apiKey?.substring(0, 10));
  
  try {
    const response = await fetch('https://api.football-data.org/v4/competitions/PL/matches?season=2024', {
      headers: {
        'X-Auth-Token': apiKey || '',
      },
      cache: 'no-store'
    });
    
    const data = await response.json();
    
    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response OK:', response.ok);
    console.log('📊 Data received:', data);
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      hasMatches: !!data.matches,
      matchCount: data.matches?.length || 0,
      error: data.message || null,
      firstMatch: data.matches?.[0] || null
    });
  } catch (error: any) {
    console.error('❌ API Test Error:', error);
    // If we get a JSON parse error, it's likely the API key is bad and it returned HTML
    if (error instanceof SyntaxError) {
        return NextResponse.json({ 
            success: false, 
            status: 401, // Unauthorized
            error: "API Anahtarı geçersiz veya yanlış formatta. API'den geçerli bir JSON yanıtı alınamadı. Lütfen anahtarınızı kontrol edin." 
        }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}