import { mapValues } from "lodash"
import { TABLE_NAME, TABLE_ALIAS, Entity, TYPE, EntityTypes } from "./symbols"

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
    TableName = string,
    TableAlias extends string = string,
    Columns = object, // extends Record<string, ColumnType<unknown>> = Record<string, ColumnType<unknown>>,
    References = object
> = TableColumnDefinitions<TableName, TableAlias, Columns> &
    TableMeta<TableName, TableAlias> &
    Entity<EntityTypes.TABLE>

export interface TableMeta<TableName, TableAlias extends string> {
    [TABLE_NAME]: TableName
    [TABLE_ALIAS]: TableAlias
}

type TableColumnDefinitions<TableName, TableAlias, Columns> = {
    [ColumnName in keyof Columns]: ColumnDefinition<TableName, Columns[ColumnName], TableAlias, ColumnName>
}

interface ColumnProps<TableName, Type, TableAlias, ColumnName> {
    tableName: TableName
    tableAlias: TableAlias
    columnName: ColumnName
    columnType: ColumnType<Type>
}

export type ColumnDefinition<TableName, Type, TableAlias = string, ColumnName = string> = ColumnProps<
    TableName,
    Type,
    TableAlias,
    ColumnName
> &
    Entity<EntityTypes.COLUMN>

export type AliasedColumn<
    ColumnAlias = string,
    TableName = string,
    Type = unknown,
    TableAlias = string,
    ColumnName = string
> = ColumnProps<TableName, Type, TableAlias, ColumnName> & { alias: ColumnAlias } & Entity<EntityTypes.ALIASED_COLUMN>

export function table<TableName extends string, Columns extends Record<string, ColumnType<unknown>>>(
    name: TableName,
    columns: Columns,
): TableDefinition<TableName, TableName, Columns, {}> {
    const columnDefinitions = mapValues(
        columns,
        (columnType, columnName) =>
            ({
                [TYPE]: EntityTypes.COLUMN,
                tableName: name,
                tableAlias: name,
                columnName,
                columnType,
            } as const),
    )
    return { [TYPE]: EntityTypes.TABLE, [TABLE_NAME]: name, [TABLE_ALIAS]: name, ...columnDefinitions }
}

type SignatureOf<Table> = Table extends TableDefinition<infer TableName, infer TableAlias, infer Columns, unknown>
    ? ProjectedTypesOf<Columns> & TableMeta<TableName, TableAlias>
    : never

type RowTypeOf<Table> = Table extends TableDefinition<unknown, string, infer Columns, unknown>
    ? ProjectedTypesOf<Columns>
    : never

type ProjectedTypesOf<Columns> = { [C in keyof Columns]: Columns[C] extends ColumnType<infer T> ? T : never }
