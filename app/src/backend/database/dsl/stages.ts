import { TableDefinition, ColumnDefinition, SqlType, Origin, SubqueryOrigin } from "./definitions"
import { PHANTOM_INSTANCE } from "./symbols"

export interface ExecResult {
    numRows: number
}

export type PickStringProperties<T> = Pick<T, keyof T & string>

type Field<T = unknown> = { sqlType: SqlType<T> }

type ProjectedTypeOf<F extends Field> = F["sqlType"][typeof PHANTOM_INSTANCE]

export type ColumnsFrom<TableAlias, SelectedColumns extends Record<string, SqlType>> = {
    [ColumnAlias in keyof SelectedColumns & string]: ColumnDefinition<
        SubqueryOrigin,
        SelectedColumns[ColumnAlias],
        TableAlias,
        ColumnAlias
    >
}

export interface FilterTableFunction<QueriedTable extends TableDefinition, ReturnType> {
    (matching: Partial<RowTypeFrom<QueriedTable>>): ReturnType
    <T>(column: PropOf<QueriedTable>, operator: "==" | "<>", value: T): ReturnType
}

export interface FilterFunction<QueriedTables extends TableDefinitions, ReturnType> {
    (
        matching: {
            [TableAlias in keyof QueriedTables]?: Partial<RowTypeFrom<QueriedTables[TableAlias]>>
        },
    ): ReturnType
    <T>(column: ColumnIn<QueriedTables>, operator: "==", value: T): ReturnType
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

export type ColumnIn<QueriedTables> = PropOf<LiftPropsOf<QueriedTables>>
export type PropOf<T> = T[keyof T]
type LiftPropsOf<QueriedTables> = {
    [TableAlias in keyof QueriedTables]: PropOf<QueriedTables[TableAlias]>
}

export type TableDefinitions = {
    [TableAlias in string]: TableDefinition<Origin, TableAlias>
}

export type QueriedTablesFromSingle<QueriedTable extends TableDefinition> = Record<
    PropOf<QueriedTable>["tableAlias"],
    QueriedTable
>

export type DefaultSelectionFromSingle<QueriedTable extends TableDefinition> = {
    [ColumnName in keyof QueriedTable]: QueriedTable[ColumnName]["sqlType"]
}

export type KeyByAlias<QueriedTable extends TableDefinition> = Record<PropOf<QueriedTable>["tableAlias"], QueriedTable>

export type AliasIn<Selection> = {
    [K in keyof Selection]: Selection[K] extends ColumnDefinition<Origin, SqlType> ? K : never
}[keyof Selection] &
    string

export type SelectionFrom<QueriedTables> = ColumnIn<QueriedTables> | SelectionRecordFrom<QueriedTables>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SelectionRecordFrom<QueriedTables> extends Record<string, SelectionFrom<QueriedTables>> {}

export type RowTypeFrom<Selection> = Selection extends ColumnDefinition<Origin, SqlType>
    ? ProjectedTypeOf<Selection>
    : {
          [K in keyof Selection]: RowTypeFrom<Selection[K]>
      }

export interface InsertStage<QueriedTable extends TableDefinition>
    extends FilterTableStage<QueriedTable>,
        JoinStage<QueriedTablesFromSingle<QueriedTable>> {
    insert(row: RowTypeFrom<QueriedTable>): ExecuteStage
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
    innerJoin<
        OtherTableOrigin extends Origin,
        OtherTable extends TableDefinition<
            OtherTableOrigin,
            string,
            Record<string, ColumnDefinition<OtherTableOrigin, SqlType>>
        >
    >(
        otherTable: OtherTable,
    ): OnStage<QueriedTables & KeyByAlias<OtherTable>>
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
    update(row: Partial<RowTypeFrom<QueriedTable>>): ExecuteStage
    delete(): ExecuteStage
}

export interface SelectStage<QueriedTables extends TableDefinitions> {
    select<Selection extends SelectionFrom<QueriedTables>>(selection: Selection): OrderStage<QueriedTables, Selection>
}

export interface OrderStage<QueriedTables extends TableDefinitions, Selection> extends LimitStage<Selection> {
    orderBy(
        column: ColumnIn<QueriedTables> | AliasIn<Selection>,
        direction?: "ASC" | "DESC",
    ): OrderedStage<QueriedTables, Selection>
}

export interface OrderedStage<QueriedTables extends TableDefinitions, Selection> extends LimitStage<Selection> {
    thenBy(
        column: ColumnIn<QueriedTables> | AliasIn<Selection>,
        direction?: "ASC" | "DESC",
    ): OrderedStage<QueriedTables, Selection>
}

export interface LimitStage<Selection> extends OffsetStage<Selection> {
    limit(limit: number): OffsetStage<Selection>
}

export interface OffsetStage<Selection> extends FetchStage<Selection> {
    offset(offset: number): FetchStage<Selection>
}

export interface FetchStage<Selection> {
    fetch(): Promise<RowTypeFrom<Selection>[]>

    render(): { sql: string; mapRow: (row: unknown[]) => RowTypeFrom<Selection> }

    // TODO: asVector, asAlias

    asTable<Alias extends string>(
        alias: Alias,
    ): Selection extends Record<string, ColumnDefinition<Origin, SqlType>>
        ? TableDefinition<
              SubqueryOrigin,
              Alias,
              ColumnsFrom<
                  Alias,
                  {
                      [ColumnName in keyof Selection]: Selection[ColumnName]["sqlType"]
                  }
              >
          >
        : never

    map<R>(f: (stage: this) => R): R
    map<R>(f: undefined | null | false | ((stage: this) => R)): R | this
}

export interface ExecuteStage {
    render(): { sql: string }
    execute(): Promise<ExecResult>
}
