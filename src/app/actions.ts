
"use server";

import { db } from "@/db";
import { matches } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function getMatchesWithTeams() {
  // Drizzle's relational queries are the recommended way to handle this.
  // The 'with' property uses the relations defined in your schema.ts to
  // correctly join and structure the data for home and away teams.
  const result = await db.query.matches.findMany({
    with: {
        homeTeam: {
            columns: {
                name: true
            }
        },
        awayTeam: {
            columns: {
                name: true
            }
        }
    },
    orderBy: [desc(matches.match_date)]
  });

  return result;
}
