import { mapValues } from "lodash"
import { PHANTOM_INSTANCE, COLUMN_DEFINITION } from "./symbols"

interface ColumnType<T, HasDefault, References> extends ColumnDetails<T, HasDefault, References> {
    orNull: () => ColumnType<T | null, HasDefault, References>
    withDefault: () => ColumnType<T, true, References>
    whichReferences: <C extends ColumnDefinition<RealTableOrigin, Exclude<T, null>>>(
        otherColumn: C,
    ) => ColumnType<T, HasDefault, C>
}

export interface ColumnDetails<T = unknown, HasDefault = boolean, References = unknown> {
    typeMapper: TypeMapper<T>
    hasDefault: HasDefault
    references: References
}

export interface TypeMapper<T = unknown> {
    [PHANTOM_INSTANCE]: T
    sqlToJs: (value: unknown) => T
    jsToSql: (value: unknown) => unknown
}

export function typeMapper<T>(mapper: Pick<TypeMapper<T>, "sqlToJs" | "jsToSql">): TypeMapper<T> {
    return {
        ...mapper,
        [PHANTOM_INSTANCE]: undefined as any,
    }
}

export function symmetricTypeMapper<T>(transform: (value: unknown) => T) {
    return { sqlToJs: transform, jsToSql: transform, [PHANTOM_INSTANCE]: undefined as any }
}
function nullableTypeMapper<T>(oldMapper: TypeMapper<T>): TypeMapper<T | null> {
    return {
        [PHANTOM_INSTANCE]: undefined as any,
        sqlToJs: value => (value === null ? null : oldMapper.sqlToJs(value)),
        jsToSql: value => (value === null ? null : oldMapper.jsToSql(value)),
    }
}

export function columnType<T, HasDefault, C extends ColumnDefinition<RealTableOrigin, Exclude<T, null>> | undefined>(
    typeMapper: TypeMapper<T>,
    hasDefault: HasDefault,
    referencingColumn: C,
): ColumnType<T, HasDefault, C> {
    return {
        typeMapper,
        hasDefault,
        references: referencingColumn,
        orNull: () =>
            columnType<T | null, HasDefault, C>(nullableTypeMapper(typeMapper), hasDefault, referencingColumn),
        withDefault: () => columnType<T, true, C>(typeMapper, true, referencingColumn),
        whichReferences: otherColumn =>
            columnType<T, HasDefault, typeof otherColumn>(typeMapper, hasDefault, otherColumn),
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
        [ColumnName in string]: ColumnDefinition<TableOrigin, unknown, boolean, TableAlias, ColumnName, unknown>
    } = {
        [ColumnName in string]: ColumnDefinition<TableOrigin, unknown, boolean, TableAlias, ColumnName, unknown>
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
    typeMapper: TypeMapper<T>
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
            Columns[ColumnName]["typeMapper"][typeof PHANTOM_INSTANCE],
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
        typeMapper: columnDetails.typeMapper,
        hasDefault: columnDetails.hasDefault,
        references: columnDetails.references,
    }))
}
