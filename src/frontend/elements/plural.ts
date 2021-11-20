export function plural(count: number, text: string, plural?: string) {
    return count === 1 ? text : plural ?? text + "s"
}
