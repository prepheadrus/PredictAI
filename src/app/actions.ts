
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc, asc, inArray, isNull, and, not, eq } from "drizzle-orm";
import { fetchFixtures, mapAndUpsertFixtures, analyzeMatches } from "@/lib/api-football";
import { revalidatePath } from "next/cache";

const TARGET_LEAGUES = ['PL', 'PD', 'SA', 'BL1', 'FL1'];
const TARGET_SEASONS = [2025, 2024]; // Try 2025 first, then fall back to 2024

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
            if (foundDataForLeague) continue; // If we found data for a league in a season, don't check older seasons for it.
            
            try {
                console.log(`--- Scanning ${league} for season ${season} ---`);
                const fixturesResponse = await fetchFixtures(league, season);
                
                if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
                    logs.push(`${league} Season ${season}: No data found.`);
                    console.warn(`⚠️ ${league} Season ${season}: No data found. Trying next...`);
                    continue;
                }
                
                foundDataForLeague = true; // Mark that we found data for this league
                const count = await mapAndUpsertFixtures(fixturesResponse);
                totalProcessed += count;
                logs.push(`${league} Season ${season}: ${count} matches processed.`);
                console.log(`✅ ${league} Season ${season}: ${count} matches processed.`);

            } catch (seasonError: any)
            {
                console.error(`❌ ${league} Season ${season} error:`, seasonError.message);
                logs.push(`${league} Season ${season} ERROR: ${seasonError.message}`);
            }
        }
    }
    
    console.log(`🎉 Fixtures update complete. Total ${totalProcessed} matches ingested from API.`);

    // Now, run analysis on un-analyzed matches
    let analyzedCount = 0;
    try {
        analyzedCount = await analyzeMatches();
        console.log(`🔬 Analysis complete. ${analyzedCount} new matches were analyzed.`);
    } catch (analysisError: any) {
        console.error('❌ Analysis phase failed:', analysisError.message);
        return { success: false, message: `Fixture refresh complete, but analysis failed: ${analysisError.message}` };
    }
    
    console.log('✅ Full process complete.');
    
    // Revalidate paths to show new data in the UI
    revalidatePath("/match-center");
    revalidatePath("/dashboard");

    return { 
        success: true, 
        message: `${totalProcessed} matches ingested from API. ${analyzedCount} new matches were analyzed.` 
    };
}
