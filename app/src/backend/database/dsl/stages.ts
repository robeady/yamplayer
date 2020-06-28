// import { Match } from "./filtering"
import { TableDefinition, ColumnDefinition, SqlType } from "./definitions"
import { PHANTOM_INSTANCE } from "./symbols"

export interface ExecResult {
    numRows: number
}

export type PickStringProperties<T> = Pick<T, keyof T & string>

type Field<T = unknown> = { sqlType: SqlType<T> }

type ProjectedTypeOf<F extends Field> = F["sqlType"][typeof PHANTOM_INSTANCE]

export interface FetchStage<SelectedColumns extends Record<string, SqlType>, OutputRow> {
    fetch(): Promise<OutputRow[]>

    asTable<Alias extends string>(alias: Alias): TableDefinition<undefined, Alias, ColumnsFrom<Alias, SelectedColumns>>
}

type ColumnsFrom<TableAlias, SelectedColumns extends Record<string, SqlType>> = {
    [ColumnAlias in keyof SelectedColumns & string]: ColumnDefinition<
        undefined,
        SelectedColumns[ColumnAlias],
        TableAlias,
        ColumnAlias
    >
}

export interface LimitStage<SelectedColumns extends Record<string, SqlType>, OutputRow>
    extends OffsetStage<SelectedColumns, OutputRow> {
    limit(count: number): OffsetStage<SelectedColumns, OutputRow>
}

export interface OffsetStage<SelectedColumns extends Record<string, SqlType>, OutputRow>
    extends FetchStage<SelectedColumns, OutputRow> {
    offset(offset: number): FetchStage<SelectedColumns, OutputRow>
}

export interface OrderStage<
    QueriedTables extends TableDefinitions,
    SelectedColumns extends Record<string, SqlType>,
    OutputRow
> extends LimitStage<SelectedColumns, OutputRow> {
    orderBy(
        column: ColumnIn<QueriedTables> | keyof SelectedColumns,
        direction?: "asc" | "desc",
    ): OrderedStage<QueriedTables, SelectedColumns, OutputRow>
}

export interface OrderedStage<
    QueriedTables extends TableDefinitions,
    SelectedColumns extends Record<string, SqlType>,
    OutputRow
> extends LimitStage<SelectedColumns, OutputRow> {
    thenBy(
        column: ColumnIn<QueriedTables> | keyof SelectedColumns,
        direction?: "asc" | "desc",
    ): OrderedStage<QueriedTables, SelectedColumns, OutputRow>
}

export interface TableFilterFunction<QueriedTable extends TableDefinition, ReturnType> {
    (matching: Partial<RowTypeFrom<QueriedTable>>): ReturnType
    <T>(column: PropOf<QueriedTable>, operator: "==", value: T): ReturnType
}

export interface JoinFilterFunction<QueriedTables extends TableDefinitions, ReturnType> {
    (
        matching: {
            [TableAlias in keyof QueriedTables]?: Partial<RowTypeFrom<QueriedTables[TableAlias]>>
        },
    ): ReturnType
    <T>(column: ColumnIn<QueriedTables>, operator: "==", value: T): ReturnType
}

export interface TableFilterStage<QueriedTable extends TableDefinition<string | undefined, string>>
    extends TableSelectStage<QueriedTable> {
    where: TableFilterFunction<QueriedTable, TableFilteredStage<QueriedTable>>
}

export interface TableFilteredStage<QueriedTable extends TableDefinition<string | undefined, string>>
    extends TableFilterStage<QueriedTable> {
    update(row: Partial<RowTypeFrom<QueriedTable>>): Promise<ExecResult>
    delete(): Promise<ExecResult>
    or: TableFilterFunction<QueriedTable, TableFilteredStage<QueriedTable>>
}

export interface TableStage<QueriedTable extends TableDefinition<string | undefined, string>>
    extends TableFilterStage<QueriedTable>,
        GeneralJoinStage<Record<PropOf<QueriedTable>["tableAlias"], QueriedTable>> {
    insert(row: RowTypeFrom<QueriedTable>): Promise<ExecResult>
}

export interface JoinedStage<QueriedTables extends TableDefinitions>
    extends JoinedSelectStage<QueriedTables>,
        GeneralJoinStage<QueriedTables> {
    where: JoinFilterFunction<QueriedTables, FilteredStage<QueriedTables>>
}

interface GeneralJoinStage<QueriedTables extends TableDefinitions> {
    join<
        OtherTableName extends string,
        OtherTable extends TableDefinition<
            OtherTableName,
            string,
            Record<string, ColumnDefinition<OtherTableName, SqlType, string, string>>
        >
    >(
        otherTable: OtherTable,
    ): PropOf<OtherTable> & ReferencesIn<QueriedTables> extends never
        ? never // references of the current set of queried tables must overlap with the columns of the new table
        : JoinedStage<QueriedTables & Record<PropOf<OtherTable>["tableAlias"], OtherTable>>

    innerJoin<
        OtherTableName extends string,
        OtherTable extends TableDefinition<
            OtherTableName,
            string,
            Record<string, ColumnDefinition<OtherTableName, SqlType, string, string>>
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

type TableDefinitions = {
    [TableAlias in string]: TableDefinition<string | undefined, TableAlias>
}

export interface TableSelectStage<QueriedTable extends TableDefinition<string | undefined, string>>
    extends GeneralSelectStage<Record<PropOf<QueriedTable>["tableAlias"], QueriedTable>>,
        OrderStage<
            Record<PropOf<QueriedTable>["tableAlias"], QueriedTable>,
            { [ColumnName in keyof QueriedTable]: QueriedTable[ColumnName]["sqlType"] },
            RowTypeFrom<QueriedTable>
        > {}

export interface JoinedSelectStage<QueriedTables extends TableDefinitions>
    extends GeneralSelectStage<QueriedTables>,
        OrderStage<QueriedTables, {}, RowTypeFrom<QueriedTables>> {}

export interface GeneralSelectStage<QueriedTables extends TableDefinitions> {
    select<Selection extends SelectionFrom<QueriedTables>>(
        selection: Selection,
    ): OrderStage<
        QueriedTables,
        Selection extends Record<string, ColumnDefinition<string, SqlType>> ? SelectedColumnsIn<Selection> : {},
        RowTypeFrom<Selection>
    >
}

export type SelectionFrom<QueriedTables> = ColumnIn<QueriedTables> | SelectionRecordFrom<QueriedTables>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SelectionRecordFrom<QueriedTables> extends Record<string, SelectionFrom<QueriedTables>> {}

export type RowTypeFrom<Selection> = Selection extends ColumnDefinition<string, SqlType>
    ? ProjectedTypeOf<Selection>
    : {
          [K in keyof Selection]: RowTypeFrom<Selection[K]>
      }

type SelectedColumnsIn<Selection extends Record<string, ColumnDefinition<string, SqlType>>> = {
    [ColumnName in keyof Selection]: Selection[ColumnName]["sqlType"]
}

export interface FilteredStage<QueriedTables extends TableDefinitions> extends JoinedSelectStage<QueriedTables> {
    and: JoinFilterFunction<QueriedTables, FilteredStage<QueriedTables>>
    or: JoinFilterFunction<QueriedTables, FilteredStage<QueriedTables>>
}
