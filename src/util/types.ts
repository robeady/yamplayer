export type Dict<T = unknown> = Record<string, T>

export type Empty = Dict<never>

export declare const OPAQUE: unique symbol

/** A floating point number between 0 and 1 inclusive */
export type Fraction = number

/** A timestamp in milliseconds since the Unix epoch */
export type Timestamp = Int & { readonly [OPAQUE]: unique symbol }

/** A number intended to be an integer */
export type Int = number

export type Require<T, K extends keyof T> = T & { [P in K]-?: T[P] }
