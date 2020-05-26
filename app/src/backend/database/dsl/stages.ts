// import { Match } from "./filtering"
import { TableDefinition, ColumnDefinition, SqlType } from "./definitions"

interface ExecResult {
    numRows: number
}

export type PickStringProperties<T> = Pick<T, keyof T & string>

type Field<T = unknown> = { sqlType: SqlType<T> }

type RowTypeFrom<
    SelectedTables extends Record<string, TableDefinition>,
    SelectedAliases extends Record<string, Field<unknown>>
> = {
    [TableAlias in keyof SelectedTables]: {
        [ColumnName in keyof SelectedTables[TableAlias]]: ProjectedTypeOf<SelectedTables[TableAlias][ColumnName]>
    }
} &
    { [A in keyof SelectedAliases]: ProjectedTypeOf<SelectedAliases[A]> }

type ProjectedTypeOf<F extends Field> = F extends Field<infer T> ? T : never

export interface FetchStage<SelectedColumns extends Record<string, SqlType>, OutputRow> {
    fetch(): OutputRow[]

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
        column: ColumnIn2<QueriedTables> | keyof SelectedColumns,
        direction?: "asc" | "desc",
    ): OrderedStage<QueriedTables, SelectedColumns, OutputRow>
}

export interface OrderedStage<
    QueriedTables extends TableDefinitions,
    SelectedColumns extends Record<string, SqlType>,
    OutputRow
> extends LimitStage<SelectedColumns, OutputRow> {
    thenBy(
        column: ColumnIn2<QueriedTables> | keyof SelectedColumns,
        direction?: "asc" | "desc",
    ): OrderedStage<QueriedTables, SelectedColumns, OutputRow>
}

export interface TableFilterFunction<QueriedTable extends TableDefinition, ReturnType> {
    (matching: Partial<QueriedTable>): ReturnType
    <T>(column: PropOf<QueriedTable>, operator: "==", value: T): ReturnType
}

export interface JoinFilterFunction<QueriedTables extends TableDefinitions, ReturnType> {
    (
        matching: {
            [TableAlias in keyof QueriedTables]?: Partial<QueriedTables[TableAlias]>
        },
    ): ReturnType
    <T>(column: ColumnIn2<QueriedTables>, operator: "==", value: T): ReturnType
}

export interface TableFilterStage<
    TableAlias extends string,
    QueriedTable extends TableDefinition<string | undefined, TableAlias>
> extends TableSelectStage<TableAlias, QueriedTable> {
    where: TableFilterFunction<QueriedTable, TableFilteredStage<TableAlias, QueriedTable>>
}

export interface TableFilteredStage<
    TableAlias extends string,
    QueriedTable extends TableDefinition<string | undefined, TableAlias>
> extends TableFilterStage<TableAlias, QueriedTable> {
    update(row: Partial<QueriedTable>): Promise<ExecResult>
    delete(): Promise<ExecResult>
    or: TableFilterFunction<QueriedTable, TableFilteredStage<TableAlias, QueriedTable>>
}

export interface TableStage<
    TableAlias extends string,
    QueriedTable extends TableDefinition<string | undefined, TableAlias>,
    References
> extends TableFilterStage<TableAlias, QueriedTable> {
    insert(row: QueriedTable): Promise<ExecResult>
    join<
        OtherTableName extends keyof References & string,
        OtherTableAlias extends string,
        OtherTableColumns extends {
            [ColumnName in string]: ColumnDefinition<OtherTableName, SqlType, OtherTableAlias, ColumnName>
        } &
            References[OtherTableName],
        OtherReferences
    >(
        otherTable: TableDefinition<OtherTableName, OtherTableAlias, OtherTableColumns, OtherReferences>,
    ): JoinedStage<
        Record<TableAlias, QueriedTable> & Record<OtherTableAlias, OtherTableColumns>,
        References & OtherReferences
    >

    innerJoin<
        OtherTableName extends string,
        OtherTableAlias extends string,
        OtherTableColumns extends {
            [ColumnName in string]: ColumnDefinition<OtherTableName, SqlType, OtherTableAlias, ColumnName>
        },
        OtherReferences
    >(
        otherTable: TableDefinition<OtherTableName, OtherTableAlias, OtherTableColumns, OtherReferences>,
    ): JoinedBeforeOnStage<
        Record<TableAlias, QueriedTable> & Record<OtherTableAlias, OtherTableColumns>,
        References & OtherReferences
    >
}

export interface JoinedStage<QueriedTables extends TableDefinitions, References>
    extends JoinedSelectStage<QueriedTables> {
    join<
        OtherTableName extends keyof References & string,
        OtherTableAlias extends string,
        OtherTableColumns extends {
            [ColumnName in string]: ColumnDefinition<OtherTableName, SqlType, OtherTableAlias, ColumnName>
        } &
            References[OtherTableName],
        OtherReferences
    >(
        otherTable: TableDefinition<OtherTableName, OtherTableAlias, OtherTableColumns, OtherReferences>,
    ): JoinedStage<QueriedTables & Record<OtherTableAlias, OtherTableColumns>, References & OtherReferences>

    innerJoin<
        OtherTableName extends string,
        OtherTableAlias extends string,
        OtherTableColumns extends {
            [ColumnName in string]: ColumnDefinition<OtherTableName, SqlType, OtherTableAlias, ColumnName>
        },
        OtherReferences
    >(
        otherTable: TableDefinition<OtherTableName, OtherTableAlias, OtherTableColumns, OtherReferences>,
    ): JoinedBeforeOnStage<QueriedTables & Record<OtherTableAlias, OtherTableColumns>, References & OtherReferences>

    where: JoinFilterFunction<QueriedTables, FilteredStage<QueriedTables>>
}

export interface JoinedAfterOnStage<QueriedTables extends TableDefinitions, References>
    extends JoinedStage<QueriedTables, References> {
    and: JoinFilterFunction<QueriedTables, JoinedAfterOnStage<QueriedTables, References>>
    or: JoinFilterFunction<QueriedTables, JoinedAfterOnStage<QueriedTables, References>>
}

export interface JoinedBeforeOnStage<QueriedTables extends TableDefinitions, References> {
    on: JoinFilterFunction<QueriedTables, JoinedAfterOnStage<QueriedTables, References>>
}

type ColumnIn2<QueriedTables> = PropOf<PropOf<QueriedTables>>
type PropOf<T> = T[keyof T]
// type SomethingMappy<QueriedTables> = {
//     [TableAlias in keyof QueriedTables]: PropOf<QueriedTables[TableAlias]>
// }
type TableIn<QueriedTables> = PropOf<QueriedTables>

type TableDefinitions = {
    [TableAlias in string]: TableDefinition<string | undefined, TableAlias>
}

export interface TableSelectStage<
    TableAlias extends string,
    QueriedTable extends TableDefinition<string | undefined, TableAlias>
>
    extends GeneralSelectStage<Record<TableAlias, QueriedTable>>,
        OrderStage<
            Record<TableAlias, QueriedTable>,
            { [ColumnName in keyof QueriedTable]: QueriedTable[ColumnName]["sqlType"] },
            RowTypeFrom<{}, QueriedTable>
        > {}

export interface JoinedSelectStage<QueriedTables extends TableDefinitions>
    extends GeneralSelectStage<QueriedTables>,
        OrderStage<QueriedTables, {}, RowTypeFrom<QueriedTables, {}>> {}

export interface GeneralSelectStage<QueriedTables extends TableDefinitions> {
    select<Column extends ColumnIn2<QueriedTables>>(
        column: Column,
    ): OrderStage<QueriedTables, Record<Column["columnName"], Column["sqlType"]>, ProjectedTypeOf<Column>>

    select<Selection extends Record<string, ColumnIn2<QueriedTables> | TableIn<QueriedTables>>>(
        selection: Selection,
    ): OrderStage<
        QueriedTables,
        SelectedColumnsIn<Selection>,
        RowTypeFrom<SelectedTablesIn<Selection>, SelectedColumnsIn<Selection>>
    >
}

type SelectedTablesIn<Selection> = {
    [TableName in SelectedTableNamesIn<Selection>]: Selection[TableName]
}

type SelectedColumnsIn<Selection> = {
    [ColumnName in SelectedColumnNamesIn<Selection>]: Selection[ColumnName]
}

type SelectedTableNamesIn<Selection> = {
    [K in keyof Selection]: Selection[K] extends ColumnDefinition<string, SqlType> ? never : K
}[keyof Selection]

type SelectedColumnNamesIn<Selection> = {
    [K in keyof Selection]: Selection[K] extends ColumnDefinition<string, SqlType> ? K : never
}[keyof Selection]

export interface FilteredStage<QueriedTables extends TableDefinitions> extends JoinedSelectStage<QueriedTables> {
    and: JoinFilterFunction<QueriedTables, FilteredStage<QueriedTables>>
    or: JoinFilterFunction<QueriedTables, FilteredStage<QueriedTables>>
}
