
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc, asc, inArray, isNull, and, not, eq } from "drizzle-orm";
import { fetchFixtures, mapAndUpsertFixtures, analyzeMatches, fetchUpcomingFixtures } from "@/lib/api-football";
import { revalidatePath } from "next/cache";
import type { MatchWithTeams } from "@/lib/types";

// API'nin desteklediği lig kodları.
const TARGET_LEAGUES = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'DED', 'PPL', 'ELC', 'BSA'];

export async function getMatchesWithTeams() {
  console.log('🔍 getMatchesWithTeams ÇAĞRILDI');
     
  const result = await db.query.matches.findMany({
    where: not(eq(matches.status, 'FT')), // Sadece bitmemiş maçları al
    with: {
        homeTeam: true,
        awayTeam: true
    },
    orderBy: [asc(matches.match_date)] // En yakın tarihli maç en üstte olacak şekilde sırala
  });
  
  console.log('📊 Bulunan maç sayısı:', result.length);
  
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
    let totalProcessed = 0;
    let logs: string[] = [];

    console.log(`[ACTION] Veri çekme işlemi başlıyor...`);

    for (const leagueCode of TARGET_LEAGUES) {
        try {
            console.log(`--- Fetching current/upcoming matches for ${leagueCode} ---`);
            const fixturesResponse = await fetchUpcomingFixtures(leagueCode);
            
            if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
                logs.push(`${leagueCode}: No current matches found.`);
                continue;
            }
            
            const count = await mapAndUpsertFixtures(fixturesResponse);
            totalProcessed += count;
            logs.push(`${leagueCode}: ${count} matches processed.`);
            
        } catch (error: any) {
            console.error(`${leagueCode} error:`, error.message);
            logs.push(`${leagueCode} ERROR: ${error.message}`);
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

