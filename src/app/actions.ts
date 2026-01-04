
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc, asc, inArray, isNull, and, not, eq } from "drizzle-orm";
import { fetchFixtures, mapAndUpsertFixtures } from "@/lib/api-football";
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
            return { success: false, message: `Error fetching data for season ${season}: ${seasonError.message}` };
        }
    }
    
    console.log(`🎉 Fixtures updated. Total ${totalProcessed} matches processed.`);

    // Now, run analysis on un-analyzed matches
    const matchesToAnalyze = await db.query.matches.findMany({
        where: and(isNull(matches.confidence), eq(matches.status, 'NS')), // Only 'Not Started' matches
        with: { homeTeam: true, awayTeam: true }
    });

    if (matchesToAnalyze.length === 0) {
        revalidatePath("/match-center");
        revalidatePath("/dashboard");
        return { success: true, message: `Fixture refresh complete. No new matches were pending analysis.` };
    }

    console.log(`🔬 Analyzing ${matchesToAnalyze.length} matches...`);

    for (const match of matchesToAnalyze) {
        if (!match.homeTeam || !match.awayTeam) continue;
        try {
            // Internally call the run-analysis route.
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
    
    console.log('✅ Analysis triggered for all pending matches.');
    
    revalidatePath("/match-center");
    revalidatePath("/dashboard");

    return { success: true, message: `${totalProcessed} matches processed and analysis triggered for ${matchesToAnalyze.length} matches.` };
}
