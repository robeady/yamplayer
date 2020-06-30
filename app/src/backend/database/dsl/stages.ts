import { TableDefinition, ColumnDefinition, SqlType, Origin, SubqueryOrigin } from "./definitions"
import { PHANTOM_INSTANCE } from "./symbols"

export interface ExecResult {
    numRows: number
}

export type PickStringProperties<T> = Pick<T, keyof T & string>

type Field<T = unknown> = { sqlType: SqlType<T> }

type ProjectedTypeOf<F extends Field> = F["sqlType"][typeof PHANTOM_INSTANCE]

export interface FetchStage<AliasedColumns extends Record<string, SqlType>, OutputRow> {
    fetch(): Promise<OutputRow[]>

    asTable<Alias extends string>(
        alias: Alias,
    ): TableDefinition<SubqueryOrigin, Alias, ColumnsFrom<Alias, AliasedColumns>>
}

type ColumnsFrom<TableAlias, SelectedColumns extends Record<string, SqlType>> = {
    [ColumnAlias in keyof SelectedColumns & string]: ColumnDefinition<
        SubqueryOrigin,
        SelectedColumns[ColumnAlias],
        TableAlias,
        ColumnAlias
    >
}

export interface LimitStage<AliasedColumns extends Record<string, SqlType>, OutputRow>
    extends OffsetStage<AliasedColumns, OutputRow> {
    limit(limit: number): OffsetStage<AliasedColumns, OutputRow>
}

export interface OffsetStage<AliasedColumns extends Record<string, SqlType>, OutputRow>
    extends FetchStage<AliasedColumns, OutputRow> {
    offset(offset: number): FetchStage<AliasedColumns, OutputRow>
}

export interface OrderStage<
    QueriedTables extends TableDefinitions,
    AliasedColumns extends Record<string, SqlType>,
    OutputRow
> extends LimitStage<AliasedColumns, OutputRow> {
    orderBy(
        column: ColumnIn<QueriedTables> | keyof AliasedColumns,
        direction?: "ASC" | "DESC",
    ): OrderedStage<QueriedTables, AliasedColumns, OutputRow>
}

export interface OrderedStage<
    QueriedTables extends TableDefinitions,
    AliasedColumns extends Record<string, SqlType>,
    OutputRow
> extends LimitStage<AliasedColumns, OutputRow> {
    thenBy(
        column: ColumnIn<QueriedTables> | keyof AliasedColumns,
        direction?: "ASC" | "DESC",
    ): OrderedStage<QueriedTables, AliasedColumns, OutputRow>
}

export interface TableFilterFunction<QueriedTable extends TableDefinition, ReturnType> {
    (matching: Partial<RowTypeFrom<QueriedTable>>): ReturnType
    <T>(column: PropOf<QueriedTable>, operator: "==" | "<>", value: T): ReturnType
}

export interface JoinFilterFunction<QueriedTables extends TableDefinitions, ReturnType> {
    (
        matching: {
            [TableAlias in keyof QueriedTables]?: Partial<RowTypeFrom<QueriedTables[TableAlias]>>
        },
    ): ReturnType
    <T>(column: ColumnIn<QueriedTables>, operator: "==", value: T): ReturnType
}

export interface TableFilterableStage<QueriedTable extends TableDefinition, ExtraReturnType = {}>
    extends GeneralJoinStage<QueriedTablesFromSingle<QueriedTable>> {
    where: TableFilterFunction<QueriedTable, TableFilteredStage<QueriedTable, ExtraReturnType> & ExtraReturnType>
}
export interface TableFilteredStage<QueriedTable extends TableDefinition, ExtraReturnType = {}>
    extends GeneralJoinStage<QueriedTablesFromSingle<QueriedTable>> {
    and: TableFilterFunction<QueriedTable, TableFilteredStage<QueriedTable, ExtraReturnType> & ExtraReturnType>
    or: TableFilterFunction<QueriedTable, TableFilteredStage<QueriedTable, ExtraReturnType> & ExtraReturnType>
}
export interface TableInsertStage<QueriedTable extends TableDefinition> extends TableUpdateStage<QueriedTable> {
    insert(row: RowTypeFrom<QueriedTable>): Promise<ExecResult>
}
export interface TableUpdateStage<QueriedTable extends TableDefinition> {
    update(row: Partial<RowTypeFrom<QueriedTable>>): Promise<ExecResult>
    delete(): Promise<ExecResult>
}

export interface SubqueryStage<QueriedTable extends TableDefinition> extends TableFilterableStage<QueriedTable> {
    // TODO: is there anything specific to a subquery?
}

export interface TableStage<QueriedTable extends TableDefinition>
    extends TableInsertStage<QueriedTable>,
        TableFilterableStage<QueriedTable, TableUpdateStage<QueriedTable>> {}

export interface JoinedStage<QueriedTables extends TableDefinitions>
    extends JoinedSelectStage<QueriedTables>,
        GeneralJoinStage<QueriedTables> {
    where: JoinFilterFunction<QueriedTables, FilteredStage<QueriedTables>>
}

export interface GeneralJoinStage<QueriedTables extends TableDefinitions> {
    join<
        OtherTableOrigin extends Origin,
        OtherTable extends TableDefinition<
            OtherTableOrigin,
            string,
            Record<string, ColumnDefinition<OtherTableOrigin, SqlType, string, string>>
        >
    >(
        otherTable: OtherTable,
    ): PropOf<OtherTable> & ReferencesIn<QueriedTables> extends never
        ? never // references of the current set of queried tables must overlap with the columns of the new table
        : JoinedStage<QueriedTables & Record<PropOf<OtherTable>["tableAlias"], OtherTable>>

    innerJoin<
        OtherTableOrigin extends Origin,
        OtherTable extends TableDefinition<
            OtherTableOrigin,
            string,
            Record<string, ColumnDefinition<OtherTableOrigin, SqlType, string, string>>
        >
    >(
        otherTable: OtherTable,
    ): JoinedBeforeOnStage<QueriedTables & Record<PropOf<OtherTable>["tableAlias"], OtherTable>>
}

export type ReferencesIn<QueriedTables extends TableDefinitions> = ColumnIn<QueriedTables>["references"]

export interface JoinedAfterOnStage<QueriedTables extends TableDefinitions> extends JoinedStage<QueriedTables> {
    and: JoinFilterFunction<QueriedTables, JoinedAfterOnStage<QueriedTables>>
    or: JoinFilterFunction<QueriedTables, JoinedAfterOnStage<QueriedTables>>
}

export interface JoinedBeforeOnStage<QueriedTables extends TableDefinitions> {
    on: JoinFilterFunction<QueriedTables, JoinedAfterOnStage<QueriedTables>>
}

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

export interface TableSelectStage<QueriedTable extends TableDefinition>
    extends GeneralSelectStage<Record<PropOf<QueriedTable>["tableAlias"], QueriedTable>>,
        OrderStage<QueriedTablesFromSingle<QueriedTable>, AliasedColumnsIn<QueriedTable>, RowTypeFrom<QueriedTable>> {}

export interface JoinedSelectStage<QueriedTables extends TableDefinitions>
    extends GeneralSelectStage<QueriedTables>,
        OrderStage<QueriedTables, {}, RowTypeFrom<QueriedTables>> {}

export type AliasedColumnsIn<Selection> = Selection extends Record<string, ColumnDefinition<string, SqlType>>
    ? {
          [ColumnName in keyof Selection]: Selection[ColumnName]["sqlType"]
      }
    : {}

export interface GeneralSelectStage<QueriedTables extends TableDefinitions> {
    select<Selection extends SelectionFrom<QueriedTables>>(
        selection: Selection,
    ): OrderStage<QueriedTables, AliasedColumnsIn<Selection>, RowTypeFrom<Selection>>
}

export type SelectionFrom<QueriedTables> = ColumnIn<QueriedTables> | SelectionRecordFrom<QueriedTables>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SelectionRecordFrom<QueriedTables> extends Record<string, SelectionFrom<QueriedTables>> {}

export type RowTypeFrom<Selection> = Selection extends ColumnDefinition<string, SqlType>
    ? ProjectedTypeOf<Selection>
    : {
          [K in keyof Selection]: RowTypeFrom<Selection[K]>
      }

export interface FilteredStage<QueriedTables extends TableDefinitions> extends JoinedSelectStage<QueriedTables> {
    and: JoinFilterFunction<QueriedTables, FilteredStage<QueriedTables>>
    or: JoinFilterFunction<QueriedTables, FilteredStage<QueriedTables>>
}
