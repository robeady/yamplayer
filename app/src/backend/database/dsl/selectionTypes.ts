import { TABLE_ALIAS, TABLE_NAME } from "./symbols"
import { TableDefinition, ColumnType } from "./definitions"

// in this file, Tables refers to a table signatures object
// - keyed by table alias
// - with each property containing the table name and alias plus a record of column name => projected type

/** Describes the type of an item in a select() */
export type SelectionFrom<Tables> =
    | ColumnIn<Tables> // could be a column in a table from Tables, maybe aliased maybe not
    | TableIn<Tables> // or could be the definition of a table that appears in Tables
// TODO: or could also be a fresh scalar

/** Describes the type of a reference to a column, which might occur in a select, orderBy or where */
export type ColumnIn<Tables, Type = unknown> = Tables extends Record<infer TableAlias, { [TABLE_NAME]: string }>
    ? TableAlias extends keyof Tables & string
        ? ColumnInTable<
              Tables,
              TableAlias,
              Tables[TableAlias][typeof TABLE_NAME],
              ColumnNamesIn<Tables[TableAlias]>,
              Type
          >
        : never
    : never

/** Describes the type of a reference to a table in a select() */
type TableIn<Tables> = Tables extends Record<infer TableAlias, { [TABLE_NAME]: string }>
    ? TableDefinition<
          Tables[TableAlias][typeof TABLE_NAME],
          TableAlias,
          Record<ColumnNamesIn<Tables[TableAlias]>, ColumnType<unknown>>,
          unknown
      >
    : never

type ColumnNamesIn<Table> = keyof Table & string

interface ColumnInTable<
    Tables,
    TableAlias extends keyof Tables & string,
    TableName,
    ColumnName extends keyof Tables[TableAlias] & string,
    ProjectedType = unknown
> {
    tableAlias: TableAlias
    tableName: TableName
    columnName: ColumnName
    columnType: ColumnType<ProjectedType>
}

export type ColumnAliasesIn<Tables, SelectionArray extends SelectionFrom<Tables>[]> = {
    [Index in keyof SelectionArray]: SelectionArray[Index] extends {
        alias: infer Alias
    }
        ? Alias extends string
            ? Alias
            : never
        : never
}[number]

export type ColumnAliasTypeIn<Tables, SelectionArray extends SelectionFrom<Tables>[], Alias> = {
    [Index in keyof SelectionArray]: SelectionArray[Index] extends {
        tableAlias: infer TableAlias
        columnName: infer ColumnName
        alias: Alias
    }
        ? TableAlias extends keyof Tables
            ? ColumnName extends keyof Tables[TableAlias]
                ? Tables[TableAlias][ColumnName]
                : never
            : never
        : never
}[number]

export type TableAliasesSelectedIn<Tables, SelectionArray extends SelectionFrom<Tables>[]> = {
    [Index in keyof SelectionArray]: SelectionArray[Index] extends
        | { [TABLE_ALIAS]: infer TableAlias }
        | { tableAlias: infer TableAlias; alias: never }
        ? TableAlias extends keyof Tables
            ? TableAlias
            : never
        : never
}[number]

export type ColumnsInTableSelectedIn<
    Tables,
    SelectionArray extends SelectionFrom<Tables>[],
    TableAlias extends keyof Tables
> = {
    [Index in keyof SelectionArray]: SelectionArray[Index] extends { [TABLE_ALIAS]: TableAlias }
        ? keyof Tables[TableAlias]
        : SelectionArray[Index] extends { tableAlias: TableAlias; columnName: infer ColumnName; alias: never }
        ? ColumnName extends keyof Tables[TableAlias]
            ? ColumnName
            : never
        : never
}[number]
