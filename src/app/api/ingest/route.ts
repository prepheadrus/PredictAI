import { NextResponse } from 'next/server';
import { fetchFixtures, mapAndUpsertFixtures } from '@/lib/api-football';

// Premier League ID = 2021 (API Dokümantasyonundaki Competition ID)
const LEAGUE_ID = "PL";

// HEDEF: Dokümantasyona göre 'season' filtresi YYYY formatında başlangıç yılını alır.
// 2023 -> 2023/2024 Sezonu (Geçmiş Veri - AI Eğitimi İçin)
// 2024 -> 2024/2025 Sezonu (AKTİF SEZON - Gelecek Maçlar Burada!)
const TARGET_SEASONS = [2023, 2024];

export async function GET() { 
    let totalProcessed = 0; 
    let logs: string[] = [];

    try { 
        console.log(`🚀 Toplu Veri Çekme İşlemi Başlatılıyor... (${new Date().toISOString()})`);

        // Her bir sezon için döngüye giriyoruz
        for (const season of TARGET_SEASONS) {
            console.log(`\n--- Sezon ${season} taranıyor ---`);
            
            try {
                // API Dokümantasyonu Referansı: /v4/competitions/{id}/matches?season={YEAR}
                const fixturesResponse = await fetchFixtures(LEAGUE_ID, season);
                
                if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
                    console.warn(`⚠️ Sezon ${season} için veri bulunamadı.`);
                    logs.push(`Sezon ${season}: Veri yok`);
                    continue;
                }
                
                console.log(`📦 Sezon ${season}: ${fixturesResponse.matches.length} maç bulundu. Veritabanına yazılıyor...`);
                
                // Veritabanına kaydet (Upsert işlemi)
                const count = await mapAndUpsertFixtures(fixturesResponse);
                
                console.log(`✅ Sezon ${season}: ${count} maç işlendi.`);
                totalProcessed += count;
                logs.push(`Sezon ${season}: ${count} maç`);

            } catch (seasonError: any) {
                console.error(`❌ Sezon ${season} hatası:`, seasonError.message);
                logs.push(`Sezon ${season} HATA: ${seasonError.message}`);
            }
        }
        
        // İşlem bitti
        console.log(`\n🎉 TÜM İŞLEMLER TAMAMLANDI. Toplam ${totalProcessed} maç veritabanında.`);
        
        return NextResponse.json({ 
            message: 'Full Ingestion Complete', 
            totalProcessed,
            details: logs,
            currentDate: new Date().toISOString()
        });

    } catch (error: any) { 
        console.error('❌ GENEL HATA:', error); 
        return NextResponse.json(
            { error: error.message || 'Beklenmeyen bir hata oluştu.' }, 
            { status: 500 } 
        ); 
    } 
}
