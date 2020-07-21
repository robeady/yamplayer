import mariadb, { Connection, UpsertResult } from "mariadb"
import schemaSql from "./schema"
import { DatabaseHandle } from "./dsl/impl"
import { ExecResult } from "./dsl/stages"

export class Database implements DatabaseHandle {
    private constructor(private connection: Connection) {}

    static async connect(): Promise<Database> {
        const connection = await mariadb.createConnection({
            host: "localhost",
            user: "yamplayer_user",
            password: "hunter2",
            database: "yamplayer",
            multipleStatements: true,
        })
        await connection.query(schemaSql)
        return new Database(connection)
    }

    async query(sql: string): Promise<unknown[][]> {
        return await this.connection.query({ sql, rowsAsArray: true })
    }

    async execute(sql: string): Promise<ExecResult> {
        const result = (await this.connection.query(sql)) as UpsertResult
        return { rowsAffected: result.affectedRows, lastInsertedId: result.insertId }
    }
}
