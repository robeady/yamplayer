export function filterMap<K extends PropertyKey, T, R>(
    record: Record<K, T>,
    f: (value: T, key: K) => R | undefined,
): Record<K, R> {
    const result = {} as Record<K, R>
    for (const k in record) {
        if (Object.prototype.hasOwnProperty.call(record, k)) {
            const r = f(record[k], k)
            if (r !== undefined) result[k] = r
        }
    }
    return result
}
