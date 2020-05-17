export function sql(strings: TemplateStringsArray, ...exprs: never[]): string {
    return strings.reduce((acc, current, i) => acc + current + exprs[i], "")
}
