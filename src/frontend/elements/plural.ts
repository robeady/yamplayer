export function plural(count: number, text: string) {
    return count === 1 ? `${count} ${text}` : `${count} ${text}s`
}
