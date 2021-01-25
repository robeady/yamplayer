import sqlstring from "sqlstring"

export interface SqlDialect {
    escape(literal: unknown): string
    escapeId(identifier: string): string
}

export class MySqlDialect implements SqlDialect {
    escape = (value: unknown) => {
        if (value instanceof Array) {
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

    escapeId = (identifier: string) => sqlstring.escapeId(identifier)
}
