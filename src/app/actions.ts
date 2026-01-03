
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc, asc, inArray, isNull, and } from "drizzle-orm";

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
        where: and(
            inArray(matches.status, ['NS', 'TBD']),
            isNotNull(matches.confidence)
        ),
        with: {
            homeTeam: true,
            awayTeam: true
        },
        orderBy: [asc(matches.match_date)],
        limit: 3
    });
    return result;
}
