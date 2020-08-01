import mariadb, { Connection, UpsertResult } from "mariadb"
import schemaSql from "./schema"
import { DatabaseHandle } from "./dsl/impl"
import { ExecResult } from "./dsl/stages"

export class MariaDB implements DatabaseHandle {
    private constructor(private connection: Connection) {}

    static async connect(port = 3306): Promise<MariaDB> {
        const connection = await mariadb.createConnection({
            host: "localhost",
            port,
            user: "yamplayer_user",
            password: "hunter2",
            database: "yamplayer",
            multipleStatements: true,
        })
        await connection.query(schemaSql)
        console.log("successfully initialised db schema")
        return new MariaDB(connection)
    }

    async query(sql: string): Promise<unknown[][]> {
        try {
            const result: unknown[][] = await this.connection.query({ sql, rowsAsArray: true })
            console.log(`${sql} produced ${result.length} rows`)
            return result
        } catch (e) {
            console.log(`${sql} threw ${e}`)
            throw e
        }
    }

    async execute(sql: string): Promise<ExecResult> {
        console.log(sql)
        const result = (await this.connection.query(sql)) as UpsertResult
        console.log(result)
        return { rowsAffected: result.affectedRows, lastInsertedId: result.insertId }
    }

    async closeConnection(): Promise<void> {
        return this.connection.end()
    }
}
