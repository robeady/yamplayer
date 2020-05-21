import { TABLE_NAME } from "./symbols"
import { TableDefinition, ColumnType, ColumnDefinition, AliasedColumn, table } from "./definitions"
import { PickStringProperties } from "./stages"

// in this file, Tables refers to a table signatures object
// - keyed by table alias
// - with each property containing the table name and alias plus a record of column name => projected type

/** Describes the type of an item in a select() */
export type SelectionFrom<Tables> =
    | TableIn<PickStringProperties<Tables>> // or could be the definition of a table that appears in Tables
    | ColumnIn<PickStringProperties<Tables>> // could be a column in a table from Tables
    | AliasedColumnIn<PickStringProperties<Tables>>

// TODO: or could also be a fresh scalar

/** Describes the type of a reference to a column, which might occur in a select, orderBy or where */

export type ColIn2<Tables> = PropOf<SomethingMappy<Tables>>

type PropOf<T> = T[keyof T & string]

type SomethingMappy<Tables> = {
    [TableAlias in keyof Tables & string]: PropOf<Tables[TableAlias]>
}

export type ColumnIn<Tables, Type = unknown> = Tables extends Record<infer TableAlias, TableDefinition>
    ? TableAlias extends keyof Tables & string
        ? ColumnDefinition<Tables[TableAlias][typeof TABLE_NAME], Type, TableAlias, ColumnNamesIn<Tables[TableAlias]>>
        : never
    : never

export type AliasedColumnIn<Tables> = Tables extends Record<infer TableAlias, TableDefinition>
    ? TableAlias extends keyof Tables & string
        ? AliasedColumn<
              string,
              Tables[TableAlias][typeof TABLE_NAME],
              unknown,
              TableAlias,
              ColumnNamesIn<Tables[TableAlias]>
          >
        : never
    : never

/** Describes the type of a reference to a table in a select() */
type TableIn<Tables> = Tables extends Record<infer TableAlias, TableDefinition>
    ? TableAlias extends string // TODO: can this be pushed into the Record constraint?
        ? TableDefinition<
              Tables[TableAlias][typeof TABLE_NAME],
              TableAlias,
              Record<ColumnNamesIn<Tables[TableAlias]>, ColumnType<unknown>>,
              unknown
          >
        : never
    : never
type ColumnNamesIn<Table> = keyof Table & string

// interface ColumnInTable<
//     Tables,
//     TableAlias extends keyof Tables & string,
//     TableName,
//     ColumnName extends keyof Tables[TableAlias] & string,
//     ProjectedType = unknown
// > {
//     tableAlias: TableAlias
//     tableName: TableName
//     columnName: ColumnName
//     columnType: ColumnType<ProjectedType>
// }

export type ColumnAliasesIn<Tables, SelectionArray extends SelectionFrom<Tables>[]> = {
    [Index in keyof SelectionArray]: SelectionArray[Index] extends AliasedColumn<infer Alias>
        ? Alias extends string // TODO can we push this constraint into AliasedColumn
            ? Alias
            : never
        : never
}[number]

export type ColumnAliasTypeIn<Tables, SelectionArray extends SelectionFrom<Tables>[], Alias> = {
    [Index in keyof SelectionArray]: SelectionArray[Index] extends AliasedColumn<
        Alias,
        string,
        unknown,
        infer TableAlias,
        infer ColumnName
    >
        ? TableAlias extends keyof Tables & string
            ? ColumnName extends keyof Tables[TableAlias]
                ? Tables[TableAlias][ColumnName]
                : never
            : never
        : never
}[number]

export type TableAliasesSelectedIn<Tables, SelectionArray extends SelectionFrom<Tables>[]> = {
    [Index in keyof SelectionArray]: SelectionArray[Index] extends
        | TableDefinition<string, infer TableAlias>
        | ColumnDefinition<string, unknown, infer TableAlias>
        ? TableAlias extends keyof Tables & string
            ? TableAlias
            : never
        : never
}[number]

export type ColumnsInTableSelectedIn<
    Tables,
    SelectionArray extends SelectionFrom<Tables>[],
    TableAlias extends keyof Tables & string
> = {
    [Index in keyof SelectionArray]: SelectionArray[Index] extends TableDefinition<string, TableAlias>
        ? keyof Tables[TableAlias]
        : SelectionArray[Index] extends ColumnDefinition<string, unknown, TableAlias, infer ColumnName>
        ? ColumnName extends keyof Tables[TableAlias]
            ? ColumnName
            : never
        : never
}[number]
