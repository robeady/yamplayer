import mariadb, { Connection, Pool, UpsertResult } from "mariadb"
import { MySqlDialect } from "./dsl/dialect"
import { DatabaseConnectionHandle, DatabaseHandle } from "./dsl/impl"
import { ExecResult } from "./dsl/stages"

class MariaDBConnection implements DatabaseConnectionHandle {
    constructor(private connection: Pool | Connection) {}

    async query(sql: string, values?: unknown[]): Promise<unknown[][]> {
        try {
            const result: unknown[][] = await this.connection.query(sql, values)
            console.log(`${sql} produced ${result.length} rows`)
            return result
        } catch (error: unknown) {
            console.log(`${sql} threw ${error}`)
            throw error
        }
    }

    async execute(sql: string, values?: unknown[]): Promise<ExecResult> {
        console.log(sql)
        const result = (await this.connection.query(sql, values)) as UpsertResult
        console.log(result)
        return { rowsAffected: result.affectedRows, lastInsertedId: result.insertId }
    }
}

export interface DbConfig {
    user: string
    password: string
    host?: string
    port?: number
    database?: string
}
export class MariaDB implements DatabaseHandle {
    private constructor(private pool: Pool) {}

    async query(sql: string, values?: unknown[]): Promise<unknown[][]> {
        return new MariaDBConnection(this.pool).query(sql, values)
    }

    async execute(sql: string, values?: unknown[]): Promise<ExecResult> {
        return new MariaDBConnection(this.pool).execute(sql, values)
    }

    static connect({
        user,
        password,
        host = "localhost",
        port = 3306,
        database = "yamplayer",
    }: DbConfig): MariaDB {
        const connectionPool = mariadb.createPool({
            host,
            port,
            user,
            password,
            database,
            // TODO: this is only enabled for running migration commands
            // for _Security_, disable it for normal queries
            multipleStatements: true,
            rowsAsArray: true,
        })
        console.log("successfully created db connection pool")
        return new MariaDB(connectionPool)
    }

    async inTransaction<T>(f: (handle: DatabaseConnectionHandle) => Promise<T>): Promise<T> {
        const connection = await this.pool.getConnection()
        try {
            await connection.beginTransaction()
            try {
                const result = await f(new MariaDBConnection(connection))
                await connection.commit()
                return result
            } catch (error: unknown) {
                await connection.rollback()
                // this code will lose the original exception if rollback() also throws
                throw error
            }
        } finally {
            connection.release()
        }
    }

    dialect = new MySqlDialect()

    async closeConnection(): Promise<void> {
        return this.pool.end()
    }
}
