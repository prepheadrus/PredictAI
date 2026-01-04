
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc, asc, inArray, isNull, and, not, eq } from "drizzle-orm";
import { fetchFixtures, mapAndUpsertFixtures, analyzeMatches } from "@/lib/api-football";
import { revalidatePath } from "next/cache";
import type { MatchWithTeams } from "@/lib/types";

// API'nin desteklediği lig kodları.
const TARGET_LEAGUES = ['PL', 'PD', 'SA', 'BL1', 'FL1'];
// En güncel veriyi bulmak için denenecek sezonlar (önce en yeni).
// 2025 gibi gelecekteki sezonlar henüz veri içermeyecektir.
const TARGET_SEASONS = [2024, 2023]; 

export async function getMatchesWithTeams() {
  console.log('🔍 getMatchesWithTeams ÇAĞRILDI');
     
  const result = await db.query.matches.findMany({
    with: {
        homeTeam: true,
        awayTeam: true
    },
    orderBy: [desc(matches.match_date)]
  });
  
  console.log('📊 Bulunan maç sayısı:', result.length);
  console.log('📋 İlk 3 maç:', JSON.stringify(result.slice(0, 3), null, 2));
  
  return result;
}

export async function getAnalyzedUpcomingMatches() {
    const result = await db.query.matches.findMany({
        where: and(not(isNull(matches.confidence)), eq(matches.status, 'NS')),
        with: {
            homeTeam: true,
            awayTeam: true
        },
        orderBy: [asc(matches.match_date)],
        limit: 3
    });
    return result;
}


export async function refreshAndAnalyzeMatches() {
    console.log('🚀🚀🚀 refreshAndAnalyzeMatches BAŞLADI');
    console.log('🔑 API Key (hardcoded) var mı?', !!'a938377027ec4af3bba0ae5a3ba19064');
    let totalProcessed = 0;
    let logs: string[] = [];

    console.log(`[ACTION] Veri çekme işlemi başlıyor...`);

    for (const leagueCode of TARGET_LEAGUES) {
        let foundDataForLeague = false;
        for (const season of TARGET_SEASONS) {
            if (foundDataForLeague) continue;
            
            try {
                console.log(`--- [ACTION] Taranıyor: Lig ${leagueCode}, Sezon ${season} ---`);
                const fixturesResponse = await fetchFixtures(leagueCode, season);
                
                if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
                    logs.push(`${leagueCode} Sezon ${season}: Veri bulunamadı.`);
                    console.warn(`⚠️ [ACTION] ${leagueCode} Sezon ${season}: Veri bulunamadı. Sonraki sezon deneniyor...`);
                    continue;
                }
                
                foundDataForLeague = true;
                console.log(`[ACTION] ${fixturesResponse.matches.length} maç bulundu: Lig ${leagueCode}, Sezon ${season}. İşleniyor...`);
                const count = await mapAndUpsertFixtures(fixturesResponse);
                totalProcessed += count;
                logs.push(`${leagueCode} Sezon ${season}: ${count} maç işlendi.`);
                console.log(`✅ [ACTION] ${leagueCode} Sezon ${season}: ${count} maç işlendi.`);

            } catch (seasonError: any)
            {
                console.error(`❌ [ACTION] Hata: Lig ${leagueCode}, Sezon ${season}. Hata Mesajı:`, seasonError.message);
                logs.push(`${leagueCode} Sezon ${season} HATA: ${seasonError.message}`);
            }
        }
    }
    
    console.log(`🎉 [ACTION] Fikstür güncellemesi tamamlandı. Toplam ${totalProcessed} maç API'den çekildi.`);

    let analyzedCount = 0;
    try {
        console.log("[ACTION] Analiz aşaması başlıyor...");
        analyzedCount = await analyzeMatches();
        console.log(`🔬 [ACTION] Analiz tamamlandı. ${analyzedCount} yeni maç analiz edildi.`);
    } catch (analysisError: any) {
        console.error('❌ [ACTION] Analiz aşaması başarısız:', analysisError.message);
        return { success: false, message: `Fikstür yenileme tamamlandı, ancak analiz başarısız oldu: ${analysisError.message}` };
    }
    
    console.log('✅ [ACTION] Tüm işlemler tamamlandı.');
    
    revalidatePath("/match-center");
    revalidatePath("/dashboard");

    return { 
        success: true, 
        message: `${totalProcessed} maç API'den çekildi. ${analyzedCount} yeni maç analiz edildi.` 
    };
}
