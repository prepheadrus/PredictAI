import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const dbPath = 'bahis.db';
const sqlite = new Database(dbPath, { fileMustExist: false });

// Simple one-time check and creation of tables
try {
    // Check if the main 'matches' table exists.
    sqlite.prepare(`SELECT id FROM matches LIMIT 1`).get();
} catch (error) {
    // If the table doesn't exist, it's likely the first run.
    console.log("Database tables not found, creating them now...");
    try {
        sqlite.exec(`
            CREATE TABLE "leagues" (
                "id" integer PRIMARY KEY NOT NULL,
                "name" text NOT NULL,
                "country" text NOT NULL
            );
            CREATE TABLE "teams" (
                "id" integer PRIMARY KEY NOT NULL,
                "name" text NOT NULL,
                "league_id" integer,
                "logo_url" text
            );
            CREATE TABLE "matches" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "api_fixture_id" integer,
                "home_team_id" integer,
                "away_team_id" integer,
                "match_date" integer,
                "home_score" integer,
                "away_score" integer,
                "status" text,
                "home_odd" real,
                "draw_odd" real,
                "away_odd" real
            );
            CREATE UNIQUE INDEX "matches_api_fixture_id_unique" ON "matches" ("api_fixture_id");
        `);
        console.log("Database tables created successfully.");
    } catch (creationError) {
        console.error("Failed to create database tables:", creationError);
        // If creation fails, we should throw to prevent the app from running in a broken state.
        throw new Error("Failed to initialize the database schema.");
    }
}


export const db = drizzle(sqlite, { schema });
