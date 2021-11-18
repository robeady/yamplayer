import { mapValues } from "lodash"
import { COLUMN_DEFINITION, PHANTOM_INSTANCE } from "./symbols"

interface ColumnType<T, HasDefault, References> extends ColumnDetails<T, HasDefault, References> {
    /**
     * Indicates that a column is nullable in the database.
     *
     * Although SQL lets you omit NULL column values from INSERT statements, using NULL as the default value
     * even if you didn't specify this when creating the table, this library requires you to opt in to this
     * behaviour by calling withDefault(), because it may be desirable to require code to explicitly set
     * nullable fields to null.
     */
    orNull: () => ColumnType<T | null, HasDefault, References>

    /** Indicates that a column has a default value in the database and therefore can be omitted from INSERT statements */
    withDefault: () => ColumnType<T, true, References>

    whichReferences: <C extends ColumnDefinition<RealTableOrigin, Exclude<T, null>>>(
        otherColumn: C,
    ) => ColumnType<T, HasDefault, C>
}

export interface ColumnDetails<T = unknown, HasDefault = boolean, References = unknown> {
    type: SqlType<T>
    hasDefault: HasDefault
    references: References
}

export interface SqlType<T = unknown> {
    [PHANTOM_INSTANCE]: T
}

export function sqlType<T>(): SqlType<T> {
    return {
        [PHANTOM_INSTANCE]: undefined as any,
    }
}

export function columnType<
    T,
    HasDefault,
    C extends ColumnDefinition<RealTableOrigin, Exclude<T, null>> | undefined
>(type: SqlType<T>, hasDefault: HasDefault, referencingColumn: C): ColumnType<T, HasDefault, C> {
    return {
        type,
        hasDefault,
        references: referencingColumn,
        orNull: () => columnType<T | null, HasDefault, C>(sqlType<T | null>(), hasDefault, referencingColumn),
        withDefault: () => columnType<T, true, C>(type, true, referencingColumn),
        whichReferences: otherColumn =>
            columnType<T, HasDefault, typeof otherColumn>(type, hasDefault, otherColumn),
    }
}

export type Origin = RealTableOrigin | SubqueryOrigin

export interface RealTableOrigin {
    type: "table"
    name: string[]
}

export interface SubqueryOrigin {
    type: "subquery"
    render: () => { sql: string }
}

export type TableDefinitions = {
    [TableAlias in string]: TableDefinition<Origin, TableAlias>
}

export type ColumnDefinitions<TableOrigin extends Origin, TableAlias> = {
    [ColumnName in string]: ColumnDefinition<TableOrigin, unknown, boolean, TableAlias, ColumnName>
}

export type TableDefinition<
    TableOrigin extends Origin = Origin,
    TableAlias extends string = string,
    Columns extends ColumnDefinitions<TableOrigin, TableAlias> = ColumnDefinitions<TableOrigin, TableAlias>
> = Columns

export type NullColumn<C extends ColumnDefinition> = C extends ColumnDefinition<
    infer O,
    unknown,
    infer H,
    infer A,
    infer N
>
    ? ColumnDefinition<O, null, H, A, N>
    : never

/** After a left join, the right table becomes nullable */
export type NullableTable<T extends TableDefinition> =
    | T
    | {
          [ColumnName in keyof T]: NullColumn<T[ColumnName]>
      }

/** After a right join, all the tables on the left become nullable */
export type NullableTables<T extends TableDefinitions> =
    | T
    | {
          [TableAlias in keyof T]: {
              [ColumnName in keyof T[TableAlias]]: NullColumn<T[TableAlias][ColumnName]>
          }
      }

export interface ColumnDefinition<
    TableOrigin extends Origin = Origin,
    T = unknown,
    HasDefault extends boolean = boolean,
    TableAlias = string,
    ColumnName = string,
    References = unknown
> {
    [COLUMN_DEFINITION]: true
    tableOrigin: TableOrigin
    tableAlias: TableAlias
    columnName: ColumnName
    type: SqlType<T>
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
            Columns[ColumnName]["type"][typeof PHANTOM_INSTANCE],
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
        type: columnDetails.type,
        hasDefault: columnDetails.hasDefault,
        references: columnDetails.references,
    }))
}

export function alias<
    O extends Origin,
    A extends string,
    C extends ColumnDefinitions<O, A>,
    B extends string
>(
    table: TableDefinition<O, A, C>,
    alias: B,
): TableDefinition<
    O,
    B,
    {
        [ColumnName in keyof C & string]: ColumnDefinition<
            O,
            C[ColumnName]["type"][typeof PHANTOM_INSTANCE],
            C[ColumnName]["hasDefault"],
            B, // this is the bit we changed
            ColumnName,
            C[ColumnName]["references"]
        >
    }
> {
    return mapValues(table, columnDef => ({
        [COLUMN_DEFINITION]: true,
        tableOrigin: columnDef.tableOrigin,
        tableAlias: alias,
        columnName: columnDef.columnName as any, // no idea why TS doesn't like this field
        type: columnDef.type,
        hasDefault: columnDef.hasDefault,
        references: columnDef.references,
    }))
}
