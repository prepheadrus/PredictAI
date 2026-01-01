
"use server";

import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getMatchesWithTeams() {
  const data = await db
    .select({
      id: matches.id,
      match_date: matches.match_date,
      home_score: matches.home_score,
      away_score: matches.away_score,
      status: matches.status,
      homeTeam: {
        name: teams.name,
      },
      awayTeam: {
        name: teams.name,
      },
    })
    .from(matches)
    .innerJoin(teams, eq(matches.home_team_id, teams.id))
    .innerJoin(teams, eq(matches.away_team_id, teams.id))
    .orderBy(desc(matches.match_date));

  // Drizzle returns a structure where both team names are under the same key.
  // We need to remap this. This is a known behavior with multiple joins on the same table.
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
  })

  return result;
}
