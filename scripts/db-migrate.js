const {readdirSync} = require('fs');
const {default: connect, sql} = require('@databases/pg');
const interrogator = require('interrogator');

console.log('Starting');

(async () => {
  let DATABASE_URL = process.env.DATABASE_URL;
  if (DATABASE_URL) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } else {
    DATABASE_URL = await interrogator.input(
      'Please enter a connection string:',
    );
  }
  const db = connect(DATABASE_URL);
  try {
    await db.tx(async (tx) => {
      await tx.query(
        sql`CREATE TABLE IF NOT EXISTS db_migrations_applied (migration_name TEXT NOT NULL PRIMARY KEY)`,
      );
    });

    const alreadyRun = new Set(
      (
        await db.query(sql`SELECT migration_name FROM db_migrations_applied`)
      ).map((r) => r.migration_name),
    );
    for (const migrationName of readdirSync(
      `${__dirname}/../db-migrations`,
    ).sort()) {
      if (!/\.sql$/.test(migrationName)) continue;
      if (alreadyRun.has(migrationName)) {
        console.log(`already applied ${migrationName}`);
      } else {
        console.log(`applying ${migrationName}`);
        await db.tx(async (tx) => {
          await tx.query([
            sql.file(`${__dirname}/../db-migrations/${migrationName}`),
          ]);
          await tx.query(
            sql`INSERT INTO db_migrations_applied (migration_name) VALUES (${migrationName})`,
          );
        });
      }
    }
    console.log(`all migrations successfully applied`);
  } finally {
    await db.dispose();
  }
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
