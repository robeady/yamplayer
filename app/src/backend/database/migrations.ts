import { sql } from "./sqltypes"

import { DatabaseHandle } from "./dsl/impl"

const migrationTablesSetup = sql`
    CREATE TABLE IF NOT EXISTS migrations (
        schemaVersion INT NOT NULL,
        executionTimestamp BIGINT NOT NULL,
        sqlForwards MEDIUMTEXT,
        sqlBackwards MEDIUMTEXT
    );
`

export interface DatabaseMigration {
    sqlForwards: string
    sqlBackwards: string
}

export async function applyMigrations(migrations: DatabaseMigration[], db: DatabaseHandle): Promise<void> {
    return db.inTransaction(async conn => {
        await conn.query(migrationTablesSetup)
        // take an exclusive lock,
        // preventing other instances from performing schema migrations at the same time as we are
        const r = await conn.query(sql`SELECT MAX(schemaVersion) FROM migrations FOR UPDATE`)
        const foundSchemaVersion = (r[0][0] as number | null) ?? -1
        const lastKnownSchemaVersion = migrations.length - 1

        if (foundSchemaVersion < lastKnownSchemaVersion) {
            console.log(
                `migrating database forwards from schema version ${foundSchemaVersion} to ${lastKnownSchemaVersion}`,
            )
            for (let i = foundSchemaVersion + 1; i <= lastKnownSchemaVersion; i++) {
                await conn.query(migrations[i].sqlForwards)
                await conn.query(
                    sql`INSERT INTO migrations (schemaVersion, executionTimestamp, sqlForwards, sqlBackwards) VALUES (?, ?, ?, ?)`,
                    [i, Date.now(), migrations[i].sqlForwards, migrations[i].sqlBackwards],
                )
            }
        } else if (foundSchemaVersion > lastKnownSchemaVersion) {
            console.log(
                `rolling back database from schema version ${foundSchemaVersion} to ${lastKnownSchemaVersion}`,
            )
            const mysteriousNewMigrations = (await conn.query(
                sql`SELECT sqlBackwards FROM migrations WHERE schemaVersion > ? ORDER BY schemaVersion DESC`,
                [lastKnownSchemaVersion],
            )) as [string][]
            for (const [rollbackSql] of mysteriousNewMigrations) {
                await conn.query(rollbackSql)
            }
        } else {
            console.log(`database is up to date with schema version ${lastKnownSchemaVersion}`)
        }
    })
}
