export function unreachable(arg: never): never {
    throw new Error(`unreachable - ${JSON.stringify(arg)}`)
}

export function isNotUndefined<T>(t: T | undefined): t is T {
    return t !== undefined
}

export function parseNumber(s: unknown): number | undefined {
    const n = Number(s)
    if (!Number.isNaN(n)) {
        return n
    }
}
