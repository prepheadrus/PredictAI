
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc, asc, inArray, isNull, and, not, eq } from "drizzle-orm";
import { fetchFixtures, mapAndUpsertFixtures, analyzeMatches } from "@/lib/api-football";
import { revalidatePath } from "next/cache";
import type { MatchWithTeams } from "@/lib/types";

// Lig kodlarını ve API ID'lerini içeren bir harita
const TARGET_LEAGUES = [
    { code: 'PL', id: 2021 },  // Premier League
    { code: 'PD', id: 2014 },  // La Liga
    { code: 'SA', id: 2019 },  // Serie A
    { code: 'BL1', id: 2002 }, // Bundesliga
    { code: 'FL1', id: 2015 }, // Ligue 1
];
const TARGET_SEASONS = [2024, 2023]; // Güncel sezonu önce dene (API genellikle mevcut yıla göre çalışır)

export async function getMatchesWithTeams() {
  const result = await db.query.matches.findMany({
    with: {
        homeTeam: true,
        awayTeam: true
    },
    orderBy: [desc(matches.match_date)]
  });

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
    let totalProcessed = 0;
    let logs: string[] = [];

    console.log(`🚀 Server Action: Batch data fetching process started...`);

    for (const league of TARGET_LEAGUES) {
        let foundDataForLeague = false;
        for (const season of TARGET_SEASONS) {
            if (foundDataForLeague) continue;
            
            try {
                console.log(`--- Scanning ${league.code} (ID: ${league.id}) for season ${season} ---`);
                const fixturesResponse = await fetchFixtures(league.id, season);
                
                if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
                    logs.push(`${league.code} Season ${season}: No data found.`);
                    console.warn(`⚠️ ${league.code} Season ${season}: No data found. Trying next...`);
                    continue;
                }
                
                foundDataForLeague = true;
                const count = await mapAndUpsertFixtures(fixturesResponse);
                totalProcessed += count;
                logs.push(`${league.code} Season ${season}: ${count} matches processed.`);
                console.log(`✅ ${league.code} Season ${season}: ${count} matches processed.`);

            } catch (seasonError: any)
            {
                console.error(`❌ ${league.code} Season ${season} error:`, seasonError.message);
                logs.push(`${league.code} Season ${season} ERROR: ${seasonError.message}`);
            }
        }
    }
    
    console.log(`🎉 Fixtures update complete. Total ${totalProcessed} matches ingested from API.`);

    let analyzedCount = 0;
    try {
        analyzedCount = await analyzeMatches();
        console.log(`🔬 Analysis complete. ${analyzedCount} new matches were analyzed.`);
    } catch (analysisError: any) {
        console.error('❌ Analysis phase failed:', analysisError.message);
        return { success: false, message: `Fixture refresh complete, but analysis failed: ${analysisError.message}` };
    }
    
    console.log('✅ Full process complete.');
    
    revalidatePath("/match-center");
    revalidatePath("/dashboard");

    return { 
        success: true, 
        message: `${totalProcessed} matches ingested from API. ${analyzedCount} new matches were analyzed.` 
    };
}
