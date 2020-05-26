import { mapValues } from "lodash"

export const t = {
    number: dbType<number>(),
    string: dbType<string>(),
    date: dbType<string>(),
}

export type SqlType<T = unknown> = {
    isAType: true
}

function dbType<T>(): SqlType<T> {
    return (undefined as unknown) as SqlType<T>
}

export type TableDefinition<
    TableName extends string | undefined = string | undefined,
    TableAlias extends string = string,
    Columns extends {
        [ColumnName in string]: ColumnDefinition<TableName, SqlType, TableAlias, ColumnName>
    } = {
        [ColumnName in string]: ColumnDefinition<TableName, SqlType, TableAlias, ColumnName>
    },
    References = object
> = Columns

export interface ColumnDefinition<TableName, SqlType, TableAlias = string, ColumnName = PropertyKey> {
    tableName: TableName
    tableAlias: TableAlias
    columnName: ColumnName
    sqlType: SqlType
}

export function table<TableName extends string, Columns extends Record<string, SqlType>>(
    name: TableName,
    columns: Columns,
): TableDefinition<
    TableName,
    TableName,
    {
        [ColumnName in keyof Columns & string]: ColumnDefinition<TableName, Columns[ColumnName], TableName, ColumnName>
    },
    {}
> {
    return mapValues(columns, (sqlType, columnName) => ({
        tableName: name,
        tableAlias: name,
        columnName: columnName,
        sqlType: sqlType,
    }))
}
