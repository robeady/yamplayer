import { moduleLogger } from "../logging"
import { DatabaseHandle } from "./dsl/impl"
import { sql } from "./sqltypes"

const logger = moduleLogger(module)

const migrationTablesSetup = sql`
    CREATE TABLE IF NOT EXISTS migrations (
        schemaVersion INT NOT NULL,
        executionTimestamp BIGINT NOT NULL,
        sqlForwards MEDIUMTEXT NOT NULL,
        sqlBackwards MEDIUMTEXT NOT NULL
    );
`

export interface DatabaseMigration {
    sqlForwards: string
    sqlBackwards: string
}

export async function applyMigrations(migrations: DatabaseMigration[], db: DatabaseHandle): Promise<void> {
    return db.inTransaction(async conn => {
        await conn.execute(migrationTablesSetup)
        // take an exclusive lock,
        // preventing other instances from performing schema migrations at the same time as we are
        const r = await conn.query(sql`SELECT MAX(schemaVersion) FROM migrations FOR UPDATE`)
        const foundSchemaVersion = (r[0]![0] as number | null) ?? -1
        const lastKnownSchemaVersion = migrations.length - 1

        if (foundSchemaVersion < lastKnownSchemaVersion) {
            logger.info(
                `migrating database forwards from schema version ${foundSchemaVersion} to ${lastKnownSchemaVersion}`,
            )
            for (let i = foundSchemaVersion + 1; i <= lastKnownSchemaVersion; i++) {
                await conn.query(migrations[i]!.sqlForwards)
                await conn.query(
                    sql`INSERT INTO migrations (schemaVersion, executionTimestamp, sqlForwards, sqlBackwards) VALUES (?, ?, ?, ?)`,
                    [i, Date.now(), migrations[i]!.sqlForwards, migrations[i]!.sqlBackwards],
                )
            }
        } else if (foundSchemaVersion > lastKnownSchemaVersion) {
            logger.info(
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
            logger.info(`database is up to date with schema version ${lastKnownSchemaVersion}`)
        }
    })
}
