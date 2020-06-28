import { mapValues } from "lodash"
import { PHANTOM_INSTANCE, COLUMN_DEFINITION } from "./symbols"

export const t = {
    number: dbType<number>(),
    string: dbType<string>(),
    date: dbType<string>(),
}

export type SqlType<T = {}> = {
    [PHANTOM_INSTANCE]: T
}

interface ColumnDetails<T = {}, C = unknown> {
    sqlType: SqlType<T>
    references: C
}

function dbType<T>(): ColumnDetails<T, undefined> & {
    whichReferences: <C extends ColumnDefinition<string, SqlType<T>>>(otherColumn: C) => ColumnDetails<T, C>
} {
    return {
        sqlType: { [PHANTOM_INSTANCE]: undefined as any },
        references: undefined,
        whichReferences: otherColumn => ({
            sqlType: { [PHANTOM_INSTANCE]: undefined as any },
            references: otherColumn,
        }),
    }
}

export interface Renderable {
    renderSql: () => string
}

export type Origin =
    | {
          type: "table"
          name: string[]
      }
    | SubqueryOrigin

export type SubqueryOrigin = { type: "subquery"; query: Renderable }

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
    TableOrigin,
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
        tableName: name,
        tableAlias: name,
        columnName: columnName,
        sqlType: columnDetails.sqlType,
        references: columnDetails.references,
    }))
}
