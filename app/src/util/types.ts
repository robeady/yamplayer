export type Dict<T = unknown> = {
    [K in string]?: T
}

export type AssocArray<T = unknown> = {
    [K in number]?: T
}
