import sqlstring from "sqlstring"

export interface SqlDialect {
    escape(literal: unknown): string
    escapeId(identifier: string): string
}

export class MySqlDialect implements SqlDialect {
    escape = (value: unknown) => {
        if (value instanceof Array) {
            return "(" + sqlstring.escape(value) + ")"
        } else if (
            value === null ||
            typeof value === "boolean" ||
            typeof value === "number" ||
            typeof value === "string"
        ) {
            return sqlstring.escape(value)
        } else {
            throw Error("invalid literal " + value)
        }
    }

    escapeId = (identifier: string) => sqlstring.escapeId(identifier)
}
