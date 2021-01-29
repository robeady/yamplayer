import { columnType, sqlType } from "./definitions"

export const binary = col<Uint8Array>()
export const number = col<number>()
export const string = col<string>()
export const boolean = col<boolean>()

function col<T>() {
    return columnType(sqlType<T>(), false, undefined)
}
