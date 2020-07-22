import { symmetricTypeMapper, columnType, typeMapper } from "./definitions"

export const number = columnType<number, false, undefined>(
    symmetricTypeMapper(value => {
        if (typeof value === "number") {
            return value
        } else {
            throw Error(`expected number, got ${typeof value} ${value}`)
        }
    }),
    false,
    undefined,
)

export const string = columnType<string, false, undefined>(
    symmetricTypeMapper(value => {
        if (typeof value === "string") {
            return value
        } else {
            throw Error(`expected string, got ${typeof value} ${value}`)
        }
    }),
    false,
    undefined,
)

export const intAsJsString = columnType<string, false, undefined>(
    typeMapper({
        sqlToJs: value => {
            if (typeof value === "number") {
                return value.toString()
            } else if (typeof value === "string") {
                return value
            } else {
                throw Error(`expected string or number, got ${typeof value} ${value}`)
            }
        },
        jsToSql: value => {
            if (typeof value === "string") {
                return parseInt(value)
            } else {
                throw Error(`expected string, got ${typeof value} ${value}`)
            }
        },
    }),
    false,
    undefined,
)
