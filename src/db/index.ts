import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const dbPath = 'bahis.db';

const sqlite = new Database(dbPath, { fileMustExist: false });
export const db = drizzle(sqlite, { schema });

// This is a workaround for a local-first setup to ensure the database
// is created and migrated on startup. In a real production app, you'd
// run migrations as a separate build step.
try {
    migrate(db, { migrationsFolder: 'drizzle' });
    console.log("Database migrated successfully.");
} catch (error) {
    console.log("Database already up-to-date or migration failed:", error);
}
