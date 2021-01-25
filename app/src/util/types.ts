export type Dict<T = unknown> = {
    [key: string]: T
}

declare const TAG: unique symbol

/** A floating point number between 0 and 1 inclusive */
export type Fraction = number

/** A unix timestamp, in seconds since the Unix epoch */
export type Timestamp = Int & { readonly [TAG]: unique symbol }

/** A number intended to be an integer */
export type Int = number
