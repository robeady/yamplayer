import { mapValues } from "lodash"
import { PHANTOM_INSTANCE, COLUMN_DEFINITION } from "./symbols"

export const t = {
    number: columnType(sqlType<number>(), undefined),
    string: columnType(sqlType<string>(), undefined),
}

export type SqlType<T = unknown> = {
    [PHANTOM_INSTANCE]: T
}

interface ColumnType<T, References> extends ColumnDetails<T, References> {
    orNull: () => ColumnType<T | null, References>
    whichReferences: <C extends ColumnDefinition<RealTableOrigin, SqlType<T>>>(otherColumn: C) => ColumnDetails<T, C>
}

interface ColumnDetails<T = unknown, C = unknown> {
    sqlType: SqlType<T>
    references: C
}

function sqlType<T>(): SqlType<T> {
    return { [PHANTOM_INSTANCE]: undefined as any }
}

function columnType<T, C extends ColumnDefinition<RealTableOrigin, SqlType<T>> | undefined>(
    sqlType: SqlType<T>,
    referencingColumn: C,
): ColumnType<T, C> {
    return {
        sqlType,
        references: referencingColumn,
        orNull: () => columnType<T | null, C>(undefined as any, referencingColumn),
        whichReferences: otherColumn => columnType<T, typeof otherColumn>(sqlType, otherColumn),
    }
}

export type Origin = RealTableOrigin | SubqueryOrigin

export type RealTableOrigin = {
    type: "table"
    name: string[]
}

export type SubqueryOrigin = { type: "subquery"; render: () => { sql: string } }

export type TableDefinition<
    TableOrigin extends Origin = Origin,
    TableAlias extends string = string,
    Columns extends {
        [ColumnName in string]: ColumnDefinition<TableOrigin, SqlType, TableAlias, ColumnName, unknown>
    } = {
        [ColumnName in string]: ColumnDefinition<TableOrigin, SqlType, TableAlias, ColumnName, unknown>
    }
> = Columns

export interface ColumnDefinition<
    TableOrigin extends Origin,
    SqlType,
    TableAlias = string,
    ColumnName = string,
    References = unknown
> {
    [COLUMN_DEFINITION]: true
    tableOrigin: TableOrigin
    tableAlias: TableAlias
    columnName: ColumnName
    sqlType: SqlType
    references: References
}

export function table<TableName extends string, Columns extends Record<string, ColumnDetails>>(
    name: TableName,
    columns: Columns,
): TableDefinition<
    { type: "table"; name: [TableName] },
    TableName,
    {
        [ColumnName in keyof Columns & string]: ColumnDefinition<
            { type: "table"; name: [TableName] },
            Columns[ColumnName]["sqlType"],
            TableName,
            ColumnName,
            Columns[ColumnName]["references"]
        >
    }
> {
    return mapValues(columns, (columnDetails, columnName) => ({
        [COLUMN_DEFINITION]: true,
        tableOrigin: { type: "table", name: [name] },
        tableAlias: name,
        columnName: columnName as any,
        sqlType: columnDetails.sqlType,
        references: columnDetails.references,
    }))
}
