import mariadb, { Pool, UpsertResult, Connection } from "mariadb"
import { DatabaseHandle, DatabaseConnectionHandle } from "./dsl/impl"
import { ExecResult } from "./dsl/stages"
import { MySqlDialect } from "./dsl/dialect"

class MariaDBConnection implements DatabaseConnectionHandle {
    constructor(private connection: Pool | Connection) {}

    async query(sql: string, values?: unknown[]): Promise<unknown[][]> {
        try {
            const result: unknown[][] = await this.connection.query(sql, values)
            console.log(`${sql} produced ${result.length} rows`)
            return result
        } catch (e) {
            console.log(`${sql} threw ${e}`)
            throw e
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
                const result = f(new MariaDBConnection(connection))
                await connection.commit()
                return result
            } catch (e) {
                await connection.rollback()
                // this code will lose the original exception if rollback() also throws
                throw e
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
