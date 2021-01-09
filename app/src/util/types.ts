export type Dict<T = unknown> = {
    [key: string]: T
}

/** a floating point number between 0 and 1 inclusive */
export type Fraction = number

/** A unix timestamp, in seconds since the Unix epoch */
export type Timestamp = Int

/** A number intended to be an integer */
export type Int = number
