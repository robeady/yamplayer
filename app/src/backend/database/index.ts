import mariadb, { Connection, UpsertResult } from "mariadb"
import schemaSql from "./schema"

export class Database {
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

    async query<R>(sql: string): Promise<R[]> {
        const rows = await this.connection.query({ sql, nestTables: true })
        return rows as R[]
    }

    async execute(sql: string): Promise<UpsertResult> {
        return this.connection.query(sql)
    }
}
