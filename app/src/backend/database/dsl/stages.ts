import {
    ColumnIn,
    SelectionFrom,
    TableAliasesSelectedIn,
    ColumnsInTableSelectedIn,
    ColumnAliasesIn,
    ColumnAliasTypeIn,
} from "./selectionTypes"

export type Match<T> = {
    [P in keyof T]?: Partial<T[P]>
}

interface ExecResult {
    numRows: number
}

interface Fetchable<Selected> {
    fetch(): Selected[]
}

export interface LimitStage<Selected> extends OffsetStage<Selected> {
    limit(count: number): OffsetStage<Selected>
}

export interface OffsetStage<Selected> extends Fetchable<Selected> {
    offset(offset: number): Fetchable<Selected>
}

export interface OrderStage<Tables, SelectedTables, SelectedAliases>
    extends LimitStage<SelectedTables & SelectedAliases> {
    orderBy(
        column: ColumnIn<Tables> | keyof SelectedAliases,
        direction?: "asc" | "desc",
    ): OrderedStage<Tables, SelectedTables, SelectedAliases>
}

export interface OrderedStage<Tables, SelectedTables, SelectedAliases>
    extends LimitStage<SelectedTables & SelectedAliases> {
    thenBy(
        column: ColumnIn<Tables> | keyof SelectedAliases,
        direction?: "asc" | "desc",
    ): OrderedStage<Tables, SelectedTables, SelectedAliases>
}

export interface FilterFunction<Row, ReturnType> {
    (matches: Match<Row>): ReturnType
    <T>(column: ColumnIn<Row, T>, operator: BinaryOp, value: T): ReturnType
}

export interface TableFilterStage<TableName, Row> extends SelectStage<Row> {
    where: FilterFunction<Row, TableFilteredStage<TableName, Row>>
}

export interface TableStage<TableName extends PropertyKey, Row, References> extends TableFilterStage<TableName, Row> {
    insert(row: Row): Promise<ExecResult>
    join<OtherTableName extends keyof References, OtherRow extends References[OtherTableName], OtherReferences>(
        otherTable: TableStage<OtherTableName, OtherRow, OtherReferences>,
    ): JoinedStage<Record<TableName, Row> & Record<OtherTableName, OtherRow>, References & OtherReferences>
}

export interface TableFilteredStage<TableName, Row> extends TableFilterStage<TableName, Row> {
    update(row: Partial<Row>): Promise<ExecResult>
    delete(): Promise<ExecResult>
    or: FilterFunction<Row, TableFilteredStage<TableName, Row>>
}

export interface JoinedStage<Row, References> extends SelectStage<Row> {
    join<OtherTableName extends keyof References, OtherRow extends References[OtherTableName], OtherReferences>(
        otherTable: TableStage<OtherTableName, OtherRow, OtherReferences>,
    ): JoinedStage<Row & Record<OtherTableName, OtherRow>, References & OtherReferences>

    innerJoin<OtherTableName extends PropertyKey, OtherRow, OtherReferences>(
        otherTable: TableStage<OtherTableName, OtherRow, OtherReferences>,
    ): JoinedBeforeOnStage<Row & Record<OtherTableName, OtherRow>, References & OtherReferences>

    where: FilterFunction<Row, FilteredStage<Row>>
}

export interface JoinedAfterOnStage<Row, References> extends JoinedStage<Row, References> {
    and: FilterFunction<Row, JoinedAfterOnStage<Row, References>>
    or: FilterFunction<Row, JoinedAfterOnStage<Row, References>>
}

export interface JoinedBeforeOnStage<Row, References> {
    on: FilterFunction<Row, JoinedAfterOnStage<Row, References>>
}

export interface SelectStage<Tables> extends OrderStage<Tables, Tables, {}> {
    select<SelectionArray extends SelectionFrom<Tables>[]>(
        ...columns: SelectionArray
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

export interface FilteredStage<Row> extends SelectStage<Row> {
    and: FilterFunction<Row, FilteredStage<Row>>
    or: FilterFunction<Row, FilteredStage<Row>>
}
