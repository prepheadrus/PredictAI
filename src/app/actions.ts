
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc, asc, inArray } from "drizzle-orm";

export async function getMatchesWithTeams() {
  // Drizzle's relational queries are the recommended way to handle this.
  // The 'with' property uses the relations defined in your schema.ts to
  // correctly join and structure the data for home and away teams.
  const result = await db.query.matches.findMany({
    with: {
        homeTeam: true,
        awayTeam: true
    },
    orderBy: [desc(matches.match_date)]
  });

  return result;
}

export async function getUpcomingMatches() {
    const result = await db.query.matches.findMany({
        where: inArray(matches.status, ['NS', 'TBD']),
        with: {
            homeTeam: true,
            awayTeam: true
        },
        orderBy: [asc(matches.match_date)],
        limit: 3
    });
    return result;
}
