export interface SqlDialect {
    id: string
}

export function sql(strings: TemplateStringsArray, ...exprs: (keyof SqlDialect)[]): (dialect: SqlDialect) => string {
    return dialect => strings.reduce((acc, current, i) => acc + current + dialect[exprs[i]], "")
}

export const mysql = {
    id: "bigint primary key auto_increment",
}

export const sqlite = {
    id: "integer primary key not null",
}
