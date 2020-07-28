import { symmetricTypeMapper, columnType, typeMapper } from "./definitions"

export const number = columnType<number, false, undefined>(
    symmetricTypeMapper(value => {
        if (typeof value === "number") {
            return value
        } else {
            throwError("number", value)
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
            throwError("string", value)
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
                throwError("string or number", value)
            }
        },
        jsToSql: value => {
            if (typeof value === "string") {
                return parseInt(value)
            } else {
                throwError("string", value)
            }
        },
    }),
    false,
    undefined,
)

export const boolean = columnType<boolean, false, undefined>(
    typeMapper({
        sqlToJs: value => {
            switch (value) {
                case 0:
                    return false
                case 1:
                    return true
                default:
                    throwError("boolean number (0 or 1)", value)
            }
        },
        jsToSql: value => {
            if (typeof value === "boolean") {
                return value
            } else {
                throwError("boolean number (0 or 1)", value)
            }
        },
    }),
    false,
    undefined,
)

function throwError(expectedType: string, value: unknown): never {
    throw Error(`expected ${expectedType}, got ${typeof value} ${JSON.stringify(value)}`)
}