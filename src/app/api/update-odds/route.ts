
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, like, sql } from 'drizzle-orm';
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
        const homeTeamSearchTerm = `${matchData.homeTeam.split(' ')[0]}%`;
        const awayTeamSearchTerm = `${matchData.awayTeam.split(' ')[0]}%`;

        // Drizzle ile ilişkisel sorgu:
        // Hem homeTeam hem de awayTeam isimlerini 'like' ile arıyoruz ve maçın durumunun 'NS' (Not Started) olduğundan emin oluyoruz.
        const foundMatches = await db.select({ id: schema.matches.id })
          .from(schema.matches)
          .leftJoin(schema.teams, eq(schema.matches.home_team_id, schema.teams.id))
          .leftJoin(schema.teams, eq(schema.matches.away_team_id, schema.teams.id))
          .where(and(
              like(schema.teams.name, homeTeamSearchTerm),
              like(schema.teams.name, awayTeamSearchTerm),
              eq(schema.matches.status, 'NS')
          ));
          
        // Birden fazla sonuç dönebilir, ilkini alıyoruz. Daha karmaşık senaryolarda tarih kontrolü de eklenebilir.
        const matchToUpdate = foundMatches[0];

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
            errors.push(`No match found for: ${matchData.homeTeam} vs ${matchData.awayTeam}`);
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
