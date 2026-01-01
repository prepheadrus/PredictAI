import { relations } from 'drizzle-orm';
import { integer, text, sqliteTable, real } from 'drizzle-orm/sqlite-core';

export const leagues = sqliteTable('leagues', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  country: text('country').notNull(),
});

export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  league_id: integer('league_id').references(() => leagues.id),
  logoUrl: text('logo_url'),
});

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey(),
  fixture_id: integer('fixture_id').unique(),
  home_team_id: integer('home_team_id').references(() => teams.id),
  away_team_id: integer('away_team_id').references(() => teams.id),
  match_date: integer('match_date', { mode: 'timestamp' }),
  home_score: integer('home_score'),
  away_score: integer('away_score'),
  status: text('status'),
  home_odd: real('home_odd'),
  draw_odd: real('draw_odd'),
  away_odd: real('away_odd'),
});

export const leaguesRelations = relations(leagues, ({ many }) => ({
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  league: one(leagues, {
    fields: [teams.league_id],
    references: [leagues.id],
  }),
  homeMatches: many(matches, { relationName: 'homeTeam' }),
  awayMatches: many(matches, { relationName: 'awayTeam' }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  homeTeam: one(teams, {
    fields: [matches.home_team_id],
    references: [teams.id],
    relationName: 'homeTeam',
  }),
  awayTeam: one(teams, {
    fields: [matches.away_team_id],
    references: [teams.id],
    relationName: 'awayTeam',
  }),
}));
