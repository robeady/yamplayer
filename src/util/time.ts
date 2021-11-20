import type { Timestamp } from "./types"

export function unixNow(): Timestamp {
    return Date.now() as Timestamp
}

export function isoToTimestamp(dateTime: string): Timestamp {
    const parsed = Date.parse(dateTime)
    if (Number.isNaN(parsed)) throw new Error("invalid ISO date-time " + dateTime)
    return parsed as Timestamp
}
