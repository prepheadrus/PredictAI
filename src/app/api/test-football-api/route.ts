import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  
  console.log('🔑 API Key exists:', !!apiKey);
  console.log('🔑 API Key first 10 chars:', apiKey?.substring(0, 10));
  
  if (!apiKey || apiKey === 'your_actual_api_key_here') {
    return NextResponse.json({
        success: false,
        error: "API Anahtarı .env dosyasında bulunamadı veya ayarlanmamış. Lütfen 'your_actual_api_key_here' değerini gerçek anahtarınızla değiştirin."
    }, { status: 500 });
  }

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
