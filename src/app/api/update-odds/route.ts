
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, like, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Zod şeması ile gelen veriyi doğruluyoruz
const matchOddSchema = z.object({
  homeTeam: z.string(),
  awayTeam: z.string(),
  homeOdd: z.number(),
  drawOdd: z.number(),
  awayOdd: z.number(),
});

const requestBodySchema = z.object({
  matches: z.array(matchOddSchema),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = requestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Invalid request body format.', details: validation.error.flatten() }, { status: 400 });
    }

    const { matches } = validation.data;
    let updatedCount = 0;
    const errors = [];

    for (const matchData of matches) {
      try {
        // Takım isimlerinin ilk kelimesini alıp LIKE için hazırlıyoruz
        const homeTeamSearchTerm = `${matchData.homeTeam.split(' ')[0]}%`;
        const awayTeamSearchTerm = `${matchData.awayTeam.split(' ')[0]}%`;

        // Drizzle ile ilişkisel sorgu: homeTeam ve awayTeam isimlerini 'like' ile arıyoruz.
        // Bu, "Manchester United" ile "Man Utd" gibi isimleri eşleştirmeye yardımcı olur.
        const homeTeamQuery = db.select({ id: schema.teams.id }).from(schema.teams).where(like(schema.teams.name, homeTeamSearchTerm));
        const awayTeamQuery = db.select({ id: schema.teams.id }).from(schema.teams).where(like(schema.teams.name, awayTeamSearchTerm));

        const [homeTeams, awayTeams] = await Promise.all([homeTeamQuery, awayTeamQuery]);

        if (homeTeams.length === 0 || awayTeams.length === 0) {
          errors.push(`Could not find a match for teams: ${matchData.homeTeam} or ${matchData.awayTeam}`);
          continue;
        }

        // Bulunan ID'ler ile maçı arıyoruz
        const matchToUpdate = await db.query.matches.findFirst({
            where: and(
                eq(schema.matches.home_team_id, homeTeams[0].id),
                eq(schema.matches.away_team_id, awayTeams[0].id),
                eq(schema.matches.status, 'NS') // Sadece başlamamış maçları güncelle
            )
        });

        if (matchToUpdate) {
          await db.update(schema.matches)
            .set({
              home_odd: matchData.homeOdd,
              draw_odd: matchData.drawOdd,
              away_odd: matchData.awayOdd,
            })
            .where(eq(schema.matches.id, matchToUpdate.id));
          
          updatedCount++;
        } else {
            errors.push(`No 'Not Started' match found for: ${matchData.homeTeam} vs ${matchData.awayTeam}`);
        }

      } catch (innerError: any) {
        errors.push(`Error processing ${matchData.homeTeam} vs ${matchData.awayTeam}: ${innerError.message}`);
      }
    }
    
    if (errors.length > 0) {
        console.warn("[update-odds] Some matches could not be updated:", errors);
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Successfully updated odds for ${updatedCount} out of ${matches.length} matches.`,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[API update-odds] Error:', error);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.', error: error.message }, { status: 500 });
  }
}

    