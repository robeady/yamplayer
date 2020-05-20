import {
    ColumnIn,
    SelectionFrom,
    TableAliasesSelectedIn,
    ColumnsInTableSelectedIn,
    ColumnAliasesIn,
    ColumnAliasTypeIn,
} from "./selectionTypes"
import { Match } from "./filtering"
import { TableDefinition } from "./definitions"
import { MULTIPLE_TABLES } from "./symbols"

interface ExecResult {
    numRows: number
}

export type PickStringProperties<T> = Pick<T, keyof T & string>

type RowTypeFrom<SelectedTables, SelectedAliases> = SelectedAliases &
    (SelectedTables extends { [MULTIPLE_TABLES]: true }
        ? {
              // if multiple tables, filter out all the non-string keys of the top level object and of each table
              [TableAlias in keyof SelectedTables & string]: PickStringProperties<SelectedTables[TableAlias]>
          } // otherwise project out the single table and filter out all its non-string keys
        : PickStringProperties<SelectedTables[keyof SelectedTables]>)

export interface FetchStage<SelectedTables, SelectedAliases> {
    fetch(): RowTypeFrom<SelectedTables, SelectedAliases>[]
}

export interface LimitStage<SelectedTables, SelectedAliases> extends OffsetStage<SelectedTables, SelectedAliases> {
    limit(count: number): OffsetStage<SelectedTables, SelectedAliases>
}

export interface OffsetStage<SelectedTables, SelectedAliases> extends FetchStage<SelectedTables, SelectedAliases> {
    offset(offset: number): FetchStage<SelectedTables, SelectedAliases>
}

export interface OrderStage<Tables, SelectedTables, SelectedAliases>
    extends LimitStage<SelectedTables, SelectedAliases> {
    orderBy(
        column: ColumnIn<Tables> | keyof SelectedAliases,
        direction?: "asc" | "desc",
    ): OrderedStage<Tables, SelectedTables, SelectedAliases>
}

export interface OrderedStage<Tables, SelectedTables, SelectedAliases>
    extends LimitStage<SelectedTables, SelectedAliases> {
    thenBy(
        column: ColumnIn<Tables> | keyof SelectedAliases,
        direction?: "asc" | "desc",
    ): OrderedStage<Tables, SelectedTables, SelectedAliases>
}

export interface FilterFunction<Tables, ReturnType> {
    (matches: Match<Tables>): ReturnType
    // <T>(column: ColumnIn<Tables, T>, operator: BinaryOp, value: T): ReturnType
}

export interface TableFilterStage<TableAlias extends string, Table> extends SelectStage<Record<TableAlias, Table>> {
    where: FilterFunction<Table, TableFilteredStage<TableAlias, Table>>
}

export interface TableStage<TableAlias extends string, Table, References> extends TableFilterStage<TableAlias, Table> {
    insert(row: Table): Promise<ExecResult>
    join<
        OtherTableName extends keyof References,
        OtherTableAlias extends string,
        OtherTable extends References[OtherTableName],
        OtherReferences
    >(
        otherTable: TableDefinition<OtherTableName, OtherTableAlias, {}, OtherReferences>,
    ): JoinedStage<
        Record<TableAlias, Table> & Record<OtherTableAlias, OtherTable> & { [MULTIPLE_TABLES]: true },
        References & OtherReferences
    >

    innerJoin<OtherTableName extends string, OtherTableAlias extends string, OtherTable, OtherReferences>(
        otherTable: TableDefinition<OtherTableName, OtherTableAlias, OtherTable, OtherReferences>,
    ): JoinedBeforeOnStage<
        Record<TableAlias, Table> & Record<OtherTableAlias, OtherTable> & { [MULTIPLE_TABLES]: true },
        References & OtherReferences
    >
}

export interface TableFilteredStage<TableAlias extends string, Table> extends TableFilterStage<TableAlias, Table> {
    update(row: Partial<Table>): Promise<ExecResult>
    delete(): Promise<ExecResult>
    or: FilterFunction<Table, TableFilteredStage<TableAlias, Table>>
}

export interface JoinedStage<Tables, References> extends SelectStage<Tables> {
    join<
        OtherTableName extends keyof References,
        OtherTableAlias extends string,
        OtherTable extends References[OtherTableName],
        OtherReferences
    >(
        otherTable: TableDefinition<OtherTableName, OtherTableAlias, OtherTable, OtherReferences>,
    ): JoinedStage<Tables & Record<OtherTableAlias, OtherTable>, References & OtherReferences>

    innerJoin<OtherTableName extends string, OtherTableAlias extends string, OtherTable, OtherReferences>(
        otherTable: TableDefinition<OtherTableName, OtherTableAlias, OtherTable, OtherReferences>,
    ): JoinedBeforeOnStage<Tables & Record<OtherTableAlias, OtherTable>, References & OtherReferences>

    where: FilterFunction<Tables, FilteredStage<Tables>>
}

export interface JoinedAfterOnStage<Tables, References> extends JoinedStage<Tables, References> {
    and: FilterFunction<Tables, JoinedAfterOnStage<Tables, References>>
    or: FilterFunction<Tables, JoinedAfterOnStage<Tables, References>>
}

export interface JoinedBeforeOnStage<Tables, References> {
    on: FilterFunction<Tables, JoinedAfterOnStage<Tables, References>>
}

export interface SelectStage<Tables> extends OrderStage<Tables, Tables, {}> {
    select<SelectionArray extends SelectionFrom<Tables>[]>(
        ...selection: SelectionArray
    ): OrderStage<
        Tables,
        {
            [TableAlias in TableAliasesSelectedIn<Tables, SelectionArray>]: {
                [Column in ColumnsInTableSelectedIn<Tables, SelectionArray, TableAlias>]: Tables[TableAlias][Column]
            }
        },
        {
            [ColumnAlias in ColumnAliasesIn<Tables, SelectionArray>]: ColumnAliasTypeIn<
                Tables,
                SelectionArray,
                ColumnAlias
            >
        }
    >
}

export interface FilteredStage<Tables> extends SelectStage<Tables> {
    and: FilterFunction<Tables, FilteredStage<Tables>>
    or: FilterFunction<Tables, FilteredStage<Tables>>
}
