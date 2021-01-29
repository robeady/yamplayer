import sqlstring from "sqlstring"

export interface SqlDialect {
    convertSqlValueToJs(sqlValue: unknown): unknown
    escapeJsValueToSql(literal: unknown): string
    escapeIdentifier(identifier: string): string
}

export class MySqlDialect implements SqlDialect {
    convertSqlValueToJs = (sqlValue: unknown) => {
        // TODO: verify that this is sensible
        return sqlValue
    }

    escapeJsValueToSql = (value: unknown) => {
        if (value instanceof Array) {
            // TODO: maybe we should do this on the caller side?
            return "(" + sqlstring.escape(value) + ")"
        } else if (value instanceof Uint8Array) {
            // sqlstring doesn't handle Uint8Array out of the box, it becomes a set of key-value pairs instead :(
            return sqlstring.escape(Buffer.from(value))
        } else if (
            value === null ||
            typeof value === "boolean" ||
            typeof value === "number" ||
            typeof value === "string" ||
            Buffer.isBuffer(value)
        ) {
            return sqlstring.escape(value)
        } else {
            throw Error(
                `invalid literal ${value}, type ${typeof value}, instanceof ${
                    (value as any)?.constructor?.name
                }`,
            )
        }
    }

    escapeIdentifier = (identifier: string) => sqlstring.escapeId(identifier)
}
