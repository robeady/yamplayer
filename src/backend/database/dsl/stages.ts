import {
    ColumnDefinition,
    NullableTable,
    NullableTables,
    Origin,
    SqlType,
    SubqueryOrigin,
    TableDefinition,
    TableDefinitions,
} from "./definitions"
import { PHANTOM_INSTANCE } from "./symbols"

export interface ExecResult {
    rowsAffected: number
    lastInsertedId: number
}

export type PickStringProperties<T> = Pick<T, keyof T & string>

type ProjectedTypeOf<Col extends { type: SqlType }> = Col["type"][typeof PHANTOM_INSTANCE]

export type ColumnsFrom<TableAlias, SelectedColumns extends Record<string, SqlType>> = {
    [ColumnAlias in keyof SelectedColumns & string]: ColumnDefinition<
        SubqueryOrigin,
        SelectedColumns[ColumnAlias],
        false,
        TableAlias,
        ColumnAlias
    >
}

export interface FilterTableFunction<QueriedTable extends TableDefinition, ReturnType> {
    (matching: Partial<RowTypeFrom<QueriedTable>>): ReturnType
    <T, C extends PropOf<QueriedTable> & ColumnDefinition<Origin, T>>(
        column: C,
        operator: "=" | "<>",
        value: T,
    ): ReturnType
    <T, C extends PropOf<QueriedTable> & ColumnDefinition<Origin, T>>(
        column: C,
        operator: "IN",
        value: T[],
    ): ReturnType
}

export interface FilterFunction<QueriedTables extends TableDefinitions, ReturnType> {
    (
        matching: {
            [TableAlias in keyof QueriedTables]?: Partial<RowTypeFrom<QueriedTables[TableAlias]>>
        },
    ): ReturnType
    <T>(
        column: ColumnOfType<ColumnIn<QueriedTables>, T>,
        operator: "=" | "IS" | "IS NOT",
        value: ExprOfType<ColumnIn<QueriedTables>, T>,
    ): ReturnType
    <T>(column: ExprOfType<ColumnIn<QueriedTables>, T>, operator: "IN", value: T[]): ReturnType
}

// export interface GeneralJoinStage<QueriedTables extends TableDefinitions> {
//     join<
//         OtherTableOrigin extends Origin,
//         OtherTable extends TableDefinition<
//             OtherTableOrigin,
//             string,
//             Record<string, ColumnDefinition<OtherTableOrigin, SqlType, string, string>>
//         >
//     >(
//         otherTable: OtherTable,
//     ): PropOf<OtherTable> & ReferencesIn<QueriedTables> extends never
//         ? never // references of the current set of queried tables must overlap with the columns of the new table
//         : JoinedStage<QueriedTables & KeyByAlias<OtherTable>>

//     innerJoin<
//         OtherTableOrigin extends Origin,
//         OtherTable extends TableDefinition<
//             OtherTableOrigin,
//             string,
//             Record<string, ColumnDefinition<OtherTableOrigin, SqlType, string, string>>
//         >
//     >(
//         otherTable: OtherTable,
//     ): JoinedBeforeOnStage<QueriedTables & KeyByAlias<OtherTable>>
// }

export type ReferencesIn<QueriedTables extends TableDefinitions> = ColumnIn<QueriedTables>["references"]

export type ColumnOfType<C, T> = C extends ColumnDefinition<Origin, T> ? C : never

export type ExprOfType<C, T> = T | ColumnOfType<C, T> | (T extends (infer U)[] ? ExprOfType<C, U>[] : never)

export type ColumnIn<QueriedTables> = PropOf<LiftPropsOf<QueriedTables>>
export type PropOf<T> = T[keyof T]
type LiftPropsOf<QueriedTables> = {
    [TableAlias in keyof QueriedTables]: PropOf<QueriedTables[TableAlias]>
}

export type QueriedTablesFromSingle<QueriedTable extends TableDefinition> = Record<
    PropOf<QueriedTable>["tableAlias"],
    QueriedTable
>

export type DefaultSelectionFromSingle<QueriedTable extends TableDefinition> = {
    [ColumnName in keyof QueriedTable]: QueriedTable[ColumnName]["type"]
}

export type KeyByAlias<QueriedTable extends TableDefinition> = Record<
    PropOf<QueriedTable>["tableAlias"],
    QueriedTable
>

export type AliasIn<Selection> = {
    [K in keyof Selection]: Selection[K] extends ColumnDefinition ? K : never
}[keyof Selection] &
    string

export type SelectionFrom<QueriedTables> = ColumnIn<QueriedTables> | SelectionRecordFrom<QueriedTables>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SelectionRecordFrom<QueriedTables> extends Record<string, SelectionFrom<QueriedTables>> {}

export type RowTypeFrom<Selection> = Selection extends ColumnDefinition
    ? ProjectedTypeOf<Selection>
    : {
          [K in keyof Selection]: RowTypeFrom<Selection[K]>
      }

export type InsertTypeFor<Table extends TableDefinition> = {
    [ColumnName in keyof Table]?: ProjectedTypeOf<Table[ColumnName]>
} &
    {
        [ColumnName in ColumnsWithoutDefaultsIn<Table>]: ProjectedTypeOf<Table[ColumnName]>
    }

type ColumnsWithoutDefaultsIn<Table extends TableDefinition> = {
    [ColumnName in keyof Table]: Table[ColumnName]["hasDefault"] extends true ? never : ColumnName
}[keyof Table]

export interface InsertStage<QueriedTable extends TableDefinition>
    extends FilterTableStage<QueriedTable>,
        JoinStage<QueriedTablesFromSingle<QueriedTable>> {
    truncate: () => ExecuteStage
    insert: (rows: InsertTypeFor<QueriedTable> | InsertTypeFor<QueriedTable>[]) => ExecuteStage
}

export interface OnStage<QueriedTables extends TableDefinitions> {
    on: FilterFunction<QueriedTables, JoinedStage<QueriedTables>>
}

export interface JoinedStage<QueriedTables extends TableDefinitions>
    extends FilterStage<QueriedTables>,
        JoinStage<QueriedTables> {
    and: FilterFunction<QueriedTables, JoinedStage<QueriedTables>>
    or: FilterFunction<QueriedTables, JoinedStage<QueriedTables>>
}

export interface JoinStage<QueriedTables extends TableDefinitions> {
    innerJoin: <
        OtherTableOrigin extends Origin,
        OtherTable extends TableDefinition<
            OtherTableOrigin,
            string,
            Record<string, ColumnDefinition<OtherTableOrigin>>
        >
    >(
        otherTable: OtherTable,
    ) => OnStage<QueriedTables & KeyByAlias<OtherTable>>

    leftJoin: <
        OtherTableOrigin extends Origin,
        OtherTable extends TableDefinition<
            OtherTableOrigin,
            string,
            Record<string, ColumnDefinition<OtherTableOrigin>>
        >
    >(
        otherTable: OtherTable,
    ) => OnStage<QueriedTables & KeyByAlias<NullableTable<OtherTable>>>

    rightJoin: <
        OtherTableOrigin extends Origin,
        OtherTable extends TableDefinition<
            OtherTableOrigin,
            string,
            Record<string, ColumnDefinition<OtherTableOrigin>>
        >
    >(
        otherTable: OtherTable,
    ) => OnStage<NullableTables<QueriedTables> & KeyByAlias<OtherTable>>
}

export interface FilteredStage<QueriedTables extends TableDefinitions>
    extends SelectStage<QueriedTables>,
        OrderStage<QueriedTables, QueriedTables> {
    and: FilterFunction<QueriedTables, FilteredStage<QueriedTables>>
    or: FilterFunction<QueriedTables, FilteredStage<QueriedTables>>
}

export interface FilterStage<QueriedTables extends TableDefinitions>
    extends SelectStage<QueriedTables>,
        OrderStage<QueriedTables, QueriedTables> {
    where: FilterFunction<QueriedTables, FilteredStage<QueriedTables>>
}

export interface FilteredTableStage<QueriedTable extends TableDefinition>
    extends SelectStage<QueriedTablesFromSingle<QueriedTable>>,
        UpdateDeleteStage<QueriedTable> {
    and: FilterTableFunction<QueriedTable, FilteredTableStage<QueriedTable>>
    or: FilterTableFunction<QueriedTable, FilteredTableStage<QueriedTable>>
}

export interface FilterTableStage<QueriedTable extends TableDefinition>
    extends SelectStage<QueriedTablesFromSingle<QueriedTable>>,
        UpdateDeleteStage<QueriedTable> {
    where: FilterTableFunction<QueriedTable, FilteredTableStage<QueriedTable>>
}

export interface UpdateDeleteStage<QueriedTable extends TableDefinition>
    extends OrderStage<QueriedTablesFromSingle<QueriedTable>, QueriedTable> {
    update: (row: Partial<RowTypeFrom<QueriedTable>>) => ExecuteStage
    delete: () => ExecuteStage
}

export interface SelectStage<QueriedTables extends TableDefinitions> {
    select: <Selection extends SelectionFrom<QueriedTables>>(
        selection: Selection,
    ) => OrderStage<QueriedTables, Selection>
}

export interface OrderStage<QueriedTables extends TableDefinitions, Selection> extends LimitStage<Selection> {
    orderBy: (
        column: ColumnIn<QueriedTables> | AliasIn<Selection>,
        direction?: "ASC" | "DESC",
    ) => OrderedStage<QueriedTables, Selection>
}

export interface OrderedStage<QueriedTables extends TableDefinitions, Selection>
    extends LimitStage<Selection> {
    thenBy: (
        column: ColumnIn<QueriedTables> | AliasIn<Selection>,
        direction?: "ASC" | "DESC",
    ) => OrderedStage<QueriedTables, Selection>
}

export interface LimitStage<Selection> extends OffsetStage<Selection> {
    limit: (limit: number) => OffsetStage<Selection>
}

export interface OffsetStage<Selection> extends FetchStage<Selection> {
    offset: (offset: number) => FetchStage<Selection>
}

export interface FetchStage<Selection> {
    fetch: () => Promise<RowTypeFrom<Selection>[]>
    fetchOne: () => Promise<RowTypeFrom<Selection>>

    render: () => { sql: string; mapRow: (row: unknown[]) => RowTypeFrom<Selection> }

    // TODO: asVector, asAlias

    asTable: <Alias extends string>(
        alias: Alias,
    ) => Selection extends Record<string, ColumnDefinition>
        ? TableDefinition<
              SubqueryOrigin,
              Alias,
              ColumnsFrom<
                  Alias,
                  {
                      [ColumnName in keyof Selection]: Selection[ColumnName]["type"]
                  }
              >
          >
        : never

    map: <R>(f: (stage: this) => R) => R
    // &    (<R>(f: undefined | null | false | ((stage: this) => R)) => R | this)
}

export interface ExecuteStage {
    render: () => { sql: string }
    execute: () => Promise<ExecResult>
}
