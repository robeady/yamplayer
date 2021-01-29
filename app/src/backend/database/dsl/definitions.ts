import { mapValues } from "lodash"
import { COLUMN_DEFINITION, PHANTOM_INSTANCE } from "./symbols"

interface ColumnType<T, HasDefault, References> extends ColumnDetails<T, HasDefault, References> {
    /**
     * Indicates that a column is nullable in the database.
     *
     * Although SQL lets you omit NULL column values from INSERT statements, using NULL as the default value
     * even if you didn't specify this when creating the table, this library requires you to opt in to this
     * behaviour by calling hasDefault(), because it may be desirable to require code to explicitly set
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

export type RealTableOrigin = {
    type: "table"
    name: string[]
}

export type SubqueryOrigin = { type: "subquery"; render: () => { sql: string } }

export type TableDefinition<
    TableOrigin extends Origin = Origin,
    TableAlias extends string = string,
    Columns extends {
        [ColumnName in string]: ColumnDefinition<
            TableOrigin,
            unknown,
            boolean,
            TableAlias,
            ColumnName,
            unknown
        >
    } = {
        [ColumnName in string]: ColumnDefinition<
            TableOrigin,
            unknown,
            boolean,
            TableAlias,
            ColumnName,
            unknown
        >
    }
> = Columns

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
