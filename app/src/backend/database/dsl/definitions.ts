import { mapValues } from "lodash"
import { PHANTOM_INSTANCE, COLUMN_DEFINITION } from "./symbols"

export const t = {
    number: columnType(sqlType<number>(), false as const, undefined),
    string: columnType(sqlType<string>(), false as const, undefined),
}

export type SqlType<T = unknown> = {
    [PHANTOM_INSTANCE]: T
}

interface ColumnType<T, HasDefault, References> extends ColumnDetails<T, HasDefault, References> {
    orNull: () => ColumnType<T | null, HasDefault, References>
    withDefault: () => ColumnType<T, true, References>
    whichReferences: <C extends ColumnDefinition<RealTableOrigin, SqlType<T>>>(
        otherColumn: C,
    ) => ColumnDetails<T, HasDefault, C>
}

interface ColumnDetails<T = unknown, HasDefault = boolean, C = unknown> {
    sqlType: SqlType<T>
    hasDefault: HasDefault
    references: C
}

function sqlType<T>(): SqlType<T> {
    return { [PHANTOM_INSTANCE]: undefined as any }
}

function columnType<T, HasDefault, C extends ColumnDefinition<RealTableOrigin, SqlType<T>> | undefined>(
    sqlType: SqlType<T>,
    hasDefault: HasDefault,
    referencingColumn: C,
): ColumnType<T, HasDefault, C> {
    return {
        sqlType,
        hasDefault,
        references: referencingColumn,
        orNull: () => columnType<T | null, HasDefault, C>(sqlType, hasDefault, referencingColumn),
        withDefault: () => columnType<T, true, C>(sqlType, true, referencingColumn),
        whichReferences: otherColumn => columnType<T, HasDefault, typeof otherColumn>(sqlType, hasDefault, otherColumn),
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
        [ColumnName in string]: ColumnDefinition<TableOrigin, SqlType, boolean, TableAlias, ColumnName, unknown>
    } = {
        [ColumnName in string]: ColumnDefinition<TableOrigin, SqlType, boolean, TableAlias, ColumnName, unknown>
    }
> = Columns

export interface ColumnDefinition<
    TableOrigin extends Origin,
    SqlType,
    HasDefault extends boolean = boolean,
    TableAlias = string,
    ColumnName = string,
    References = unknown
> {
    [COLUMN_DEFINITION]: true
    tableOrigin: TableOrigin
    tableAlias: TableAlias
    columnName: ColumnName
    sqlType: SqlType
    hasDefault: HasDefault
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
            Columns[ColumnName]["hasDefault"],
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
        hasDefault: columnDetails.hasDefault,
        references: columnDetails.references,
    }))
}
