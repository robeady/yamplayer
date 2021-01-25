import { Timestamp } from "./types"

export function unixNow(): Timestamp {
    return Math.round(Date.now() / 1000) as Timestamp
}

export function isoDateTimeToUnix(dateTime: string): Timestamp {
    const parsed = Date.parse(dateTime)
    if (isNaN(parsed)) throw Error("invalid ISO date-time " + dateTime)
    return Math.round(parsed / 1000) as Timestamp
}
