
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc, asc, inArray, isNull, and, not, eq } from "drizzle-orm";
import { fetchFixtures, mapAndUpsertFixtures, analyzeMatches } from "@/lib/api-football";
import { revalidatePath } from "next/cache";
import type { MatchWithTeams } from "@/lib/types";

// Using competition codes as per API documentation
const TARGET_LEAGUES = ['PL', 'PD', 'SA', 'BL1', 'FL1'];
// Let's try the most recent complete season first as it's more likely to have data.
const TARGET_SEASONS = [2024, 2023]; 

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

    for (const leagueCode of TARGET_LEAGUES) {
        let foundDataForLeague = false;
        for (const season of TARGET_SEASONS) {
            if (foundDataForLeague) continue;
            
            try {
                console.log(`--- [ACTION] Scanning ${leagueCode} for season ${season} ---`);
                const fixturesResponse = await fetchFixtures(leagueCode, season);
                
                if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
                    logs.push(`${leagueCode} Season ${season}: No data found.`);
                    console.warn(`⚠️ [ACTION] ${leagueCode} Season ${season}: No data found. Trying next...`);
                    continue;
                }
                
                foundDataForLeague = true;
                console.log(`[ACTION] Found ${fixturesResponse.matches.length} matches for ${leagueCode} season ${season}. Processing...`);
                const count = await mapAndUpsertFixtures(fixturesResponse);
                totalProcessed += count;
                logs.push(`${leagueCode} Season ${season}: ${count} matches processed.`);
                console.log(`✅ [ACTION] ${leagueCode} Season ${season}: ${count} matches processed.`);

            } catch (seasonError: any)
            {
                console.error(`❌ [ACTION] ${leagueCode} Season ${season} error:`, seasonError.message);
                logs.push(`${leagueCode} Season ${season} ERROR: ${seasonError.message}`);
            }
        }
    }
    
    console.log(`🎉 [ACTION] Fixtures update complete. Total ${totalProcessed} matches ingested from API.`);

    let analyzedCount = 0;
    try {
        console.log(`[ACTION] Starting analysis phase...`);
        analyzedCount = await analyzeMatches();
        console.log(`🔬 [ACTION] Analysis complete. ${analyzedCount} new matches were analyzed.`);
    } catch (analysisError: any) {
        console.error('❌ [ACTION] Analysis phase failed:', analysisError.message);
        return { success: false, message: `Fixture refresh complete, but analysis failed: ${analysisError.message}` };
    }
    
    console.log('✅ [ACTION] Full process complete.');
    
    revalidatePath("/match-center");
    revalidatePath("/dashboard");

    return { 
        success: true, 
        message: `${totalProcessed} matches ingested from API. ${analyzedCount} new matches were analyzed.` 
    };
}
