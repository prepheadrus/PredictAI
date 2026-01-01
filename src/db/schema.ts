import { relations } from 'drizzle-orm';
import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';

export const leagues = sqliteTable('leagues', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  country: text('country').notNull(),
});

export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  logoUrl: text('logo_url').notNull(),
});

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey(),
  homeTeamId: integer('home_team_id')
    .notNull()
    .references(() => teams.id),
  awayTeamId: integer('away_team_id')
    .notNull()
    .references(() => teams.id),
  leagueId: integer('league_id')
    .notNull()
    .references(() => leagues.id),
  matchDate: integer('match_date', { mode: 'timestamp' }).notNull(),
});

export const leaguesRelations = relations(leagues, ({ many }) => ({
  matches: many(matches),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  homeMatches: many(matches, { relationName: 'homeTeam' }),
  awayMatches: many(matches, { relationName: 'awayTeam' }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: 'homeTeam',
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: 'awayTeam',
  }),
  league: one(leagues, {
    fields: [matches.leagueId],
    references: [leagues.id],
  }),
}));
