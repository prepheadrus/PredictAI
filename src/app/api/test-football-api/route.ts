import { NextResponse } from 'next/server';

export async function GET() {
  // DIAGNOSTIC STEP: Hardcode the API key to bypass any .env loading issues.
  const apiKey = 'a938377027ec4af3bba0ae5a3ba19064';
  
  console.log('🔑 [DIAGNOSTIC] Using hardcoded API Key:', apiKey?.substring(0, 10));
  
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
    
    if (response.status === 400 && data.message === 'Your API token is invalid.') {
         return NextResponse.json({
            success: false,
            status: response.status,
            error: "API anahtarı, doğrudan koda gömülü olmasına rağmen 'geçersiz' olarak bildirildi. Lütfen football-data.org panosundan anahtarın hala aktif olduğunu doğrulayın veya yeni bir tane oluşturun."
        }, { status: 400 });
    }

    // If we get a JSON parse error, it's likely the API key is bad and it returned HTML
    if (data.error && error instanceof SyntaxError) {
        return NextResponse.json({ 
            success: false, 
            status: 401, // Unauthorized
            error: "API Anahtarı geçersiz veya yanlış formatta. API'den geçerli bir JSON yanıtı alınamadı. Lütfen anahtarınızı kontrol edin." 
        }, { status: 401 });
    }

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
