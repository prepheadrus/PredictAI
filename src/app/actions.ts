
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc, asc, inArray, isNull, and, not, eq } from "drizzle-orm";
import { fetchFixtures, mapAndUpsertFixtures, analyzeMatches } from "@/lib/api-football";
import { revalidatePath } from "next/cache";

const TARGET_LEAGUE = "PL";
const TARGET_SEASONS = [2024, 2025]; // 2024 for past data, 2025 for current/upcoming

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

    for (const season of TARGET_SEASONS) {
        try {
            console.log(`--- Scanning season ${season} ---`);
            const fixturesResponse = await fetchFixtures(TARGET_LEAGUE, season);
            
            if (!fixturesResponse || !fixturesResponse.matches || fixturesResponse.matches.length === 0) {
                logs.push(`Season ${season}: No data found.`);
                continue;
            }
            
            const count = await mapAndUpsertFixtures(fixturesResponse);
            totalProcessed += count;
            logs.push(`Season ${season}: ${count} matches processed.`);

        } catch (seasonError: any) {
            console.error(`❌ Season ${season} error:`, seasonError.message);
            logs.push(`Season ${season} ERROR: ${seasonError.message}`);
            // Do not stop the whole process, just log and continue
        }
    }
    
    console.log(`🎉 Fixtures updated. Total ${totalProcessed} matches processed from API.`);

    // Now, run analysis on un-analyzed matches
    let analyzedCount = 0;
    try {
        analyzedCount = await analyzeMatches();
        console.log(`🔬 Analysis complete. ${analyzedCount} matches were analyzed.`);
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
