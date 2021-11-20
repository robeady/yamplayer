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

export class MariaDB implements DatabaseHandle {
    private constructor(private pool: Pool) {}

    async query(sql: string, values?: unknown[]): Promise<unknown[][]> {
        return new MariaDBConnection(this.pool).query(sql, values)
    }

    async execute(sql: string, values?: unknown[]): Promise<ExecResult> {
        return new MariaDBConnection(this.pool).execute(sql, values)
    }

    static connect(port = 3306): MariaDB {
        const connectionPool = mariadb.createPool({
            host: "localhost",
            port,
            user: "yamplayer_user",
            password: "hunter2",
            database: "yamplayer",
            multipleStatements: true,
            connectionLimit: 3,
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
