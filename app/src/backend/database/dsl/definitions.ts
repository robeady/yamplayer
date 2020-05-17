import { mapValues } from "lodash"
import { TABLE_NAME, TABLE_ALIAS } from "./symbols"

export const t = {
    number: dbType<number>(),
    string: dbType<string>(),
    date: dbType<string>(),
}

export type ColumnType<T> = {
    isAType: true
}

function dbType<T>(): ColumnType<T> {
    return (undefined as unknown) as ColumnType<T>
}

export type TableDefinition<
    TableName,
    TableAlias,
    Columns extends Record<string, ColumnType<unknown>>
> = TableColumnDefinitions<TableName, Columns> & TableMeta<TableName, TableAlias>

interface TableMeta<TableName, TableAlias> {
    [TABLE_NAME]: TableName
    [TABLE_ALIAS]: TableAlias
}

type TableColumnDefinitions<TableName, Columns> = {
    [ColumnName in keyof Columns]: ColumnDefinition<TableName, Columns[ColumnName]>
}

interface ColumnDefinition<TableName, Type> {
    tableName: TableName
    tableAlias: string
    columnName: string
    columnType: ColumnType<Type>
}

export function table<TableName extends string, Columns extends Record<string, ColumnType<unknown>>>(
    name: TableName,
    columns: Columns,
): TableDefinition<TableName, TableName, Columns> {
    const columnDefinitions = mapValues(columns, (columnType, columnName) => ({
        tableName: name,
        tableAlias: name,
        columnName,
        columnType,
    }))
    return { [TABLE_NAME]: name, [TABLE_ALIAS]: name, ...columnDefinitions }
}

type SignatureOf<Table> = Table extends TableDefinition<infer TableName, infer TableAlias, infer Columns>
    ? ProjectedTypesOf<Columns> & TableMeta<TableName, TableAlias>
    : never

type RowTypeOf<Table> = Table extends TableDefinition<unknown, unknown, infer Columns>
    ? ProjectedTypesOf<Columns>
    : never

type ProjectedTypesOf<Columns> = { [C in keyof Columns]: Columns[C] extends ColumnType<infer T> ? T : never }
