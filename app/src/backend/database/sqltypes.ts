export function sql(strings: TemplateStringsArray, ...exprs: never[]): string {
    let result = strings[0]!
    for (let i = 1; i < strings.length; i++) {
        result += exprs[i - 1]!
        result += strings[i]!
    }
    return result
}
