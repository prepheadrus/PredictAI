
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc, asc, inArray, isNull, and, not } from "drizzle-orm";
import { fetchFixtures, mapAndUpsertFixtures } from "@/lib/api-football";
import { revalidatePath } from "next/cache";

const TARGET_LEAGUE = "PL";
const TARGET_SEASONS = [2023, 2024];

export async function getMatchesWithTeams() {
  const result = await db.query.matches.findMany({
    with: {
        homeTeam: {
            columns: {
                name: true,
                logoUrl: true,
            }
        },
        awayTeam: {
            columns: {
                name: true,
                logoUrl: true,
            }
        }
    },
    orderBy: [desc(matches.match_date)]
  });

  return result;
}

export async function getAnalyzedUpcomingMatches() {
    const result = await db.query.matches.findMany({
        where: and(not(isNull(matches.confidence))),
        with: {
            homeTeam: true,
            awayTeam: true
        },
        orderBy: [asc(matches.match_date)],
        limit: 3
    });
    return result;
}

// Fikstürü yenileyen ve veritabanına kaydeden server action
export async function refreshAndAnalyzeMatches() {
    let totalProcessed = 0;
    let logs: string[] = [];

    console.log(`🚀 Server Action: Toplu Veri Çekme İşlemi Başlatılıyor...`);

    for (const season of TARGET_SEASONS) {
        try {
            console.log(`--- Sezon ${season} taranıyor ---`);
            const fixturesResponse = await fetchFixtures(TARGET_LEAGUE, season);
            
            if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
                logs.push(`Sezon ${season}: Veri yok`);
                continue;
            }
            
            const count = await mapAndUpsertFixtures(fixturesResponse);
            totalProcessed += count;
            logs.push(`Sezon ${season}: ${count} maç`);

        } catch (seasonError: any) {
            console.error(`❌ Sezon ${season} hatası:`, seasonError.message);
            logs.push(`Sezon ${season} HATA: ${seasonError.message}`);
            return { success: false, message: `Sezon ${season} verisi çekilirken hata oluştu: ${seasonError.message}` };
        }
    }
    
    console.log(`🎉 Fikstürler tamamlandı. Toplam ${totalProcessed} maç işlendi.`);

    // Şimdi analiz edilmemiş maçları analiz et
    const matchesToAnalyze = await db.query.matches.findMany({
        where: isNull(matches.confidence),
        with: { homeTeam: true, awayTeam: true }
    });

    if (matchesToAnalyze.length === 0) {
        revalidatePath("/match-center");
        return { success: true, message: `Fikstür yenilendi. Analiz bekleyen yeni maç bulunamadı.` };
    }

    console.log(`🔬 ${matchesToAnalyze.length} maç analiz edilecek...`);

    for (const match of matchesToAnalyze) {
        if (!match.homeTeam || !match.awayTeam) continue;
        try {
            // Internally call the run-analysis route. In a real app, you might call the function directly.
            const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:9002';
            const response = await fetch(`${host}/api/run-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId: match.id }),
                 cache: 'no-store'
            });
            if (!response.ok) {
                 const result = await response.json();
                 console.error(`Analysis failed for match ${match.id}:`, result.error);
            }
        } catch(e: any) {
            console.error(`Analysis request failed for match ${match.id}:`, e.message);
        }
    }
    
    console.log('✅ Tüm analizler tamamlandı.');
    
    revalidatePath("/match-center");

    return { success: true, message: `${totalProcessed} maç işlendi ve ${matchesToAnalyze.length} maçın analizi tetiklendi.` };
}
