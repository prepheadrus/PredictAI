import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const dbPath = 'bahis.db';
const sqlite = new Database(dbPath, { fileMustExist: false });

// Simple one-time check and creation of tables
try {
    // Check if the main 'matches' table has the new analysis columns.
    // If this fails, we assume the schema is old and needs to be created.
    sqlite.prepare(`SELECT home_win_prob FROM matches LIMIT 1`).get();
} catch (error) {
    // If the columns don't exist, we'll recreate the tables.
    // This is a simple migration strategy for this project. For a real-world app,
    // a more robust migration tool (like drizzle-kit migrate) would be used.
    console.log("Database schema is outdated or not found, recreating tables...");
    try {
        sqlite.exec('DROP TABLE IF EXISTS "matches";');
        sqlite.exec('DROP TABLE IF EXISTS "teams";');
        sqlite.exec('DROP TABLE IF EXISTS "leagues";');
        
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
                "away_odd" real,
                "home_win_prob" real,
                "draw_prob" real,
                "away_win_prob" real,
                "predicted_score" text,
                "confidence" real
            );
            CREATE UNIQUE INDEX "matches_api_fixture_id_unique" ON "matches" ("api_fixture_id");
        `);
        console.log("Database tables recreated successfully with new schema.");
    } catch (creationError) {
        console.error("Failed to create database tables:", creationError);
        throw new Error("Failed to initialize the database schema.");
    }
}


export const db = drizzle(sqlite, { schema });
