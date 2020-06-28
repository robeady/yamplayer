import {
    TableStage,
    TableFilteredStage,
    ExecResult,
    OrderedStage,
    RowTypeFrom,
    OffsetStage,
    FetchStage,
    PropOf,
    ColumnIn,
    SelectionFrom,
    DefaultSelectionFromSingle,
    QueriedTablesFromSingle,
    AliasedColumnsIn,
    TableDefinitions,
    OrderStage,
} from "./stages"
import { TableDefinition, ColumnDefinition, Origin, SubqueryOrigin, SqlType } from "./definitions"
import { COLUMN_DEFINITION, RAW_SQL } from "./symbols"

interface DatabaseHandle {
    execute(sql: string): Promise<ExecResult>
    fetch(sql: string): Promise<any[][]>
}

function renderIdentifier(identifier: string) {
    return identifier
}

function renderLiteral(literalValue: unknown) {
    return literalValue
}

interface QueryData<Selection> {
    limit?: number
    offset?: number
    orderBy: {
        column: keyof AliasedColumnsIn<Selection> | ColumnDefinition<Origin, unknown> // TODO are these type arguments right?
        direction?: "ASC" | "DESC"
    }[]
}

// type QueriedTablesFrom<QueriedTable extends TableDefinition<Origin | undefined, string>> = Record<
//     PropOf<QueriedTable>["tableAlias"],
//     QueriedTable
// >

// type SelectedColumnsFrom<QueriedTable extends TableDefinition<Origin | undefined, string>> = {
//     [ColumnName in keyof QueriedTable]: QueriedTable[ColumnName]["sqlType"]
// }

class SelectedImpl<QueriedTables extends TableDefinitions, Selection>
    implements
        OrderStage<QueriedTables, AliasedColumnsIn<Selection>, RowTypeFrom<Selection>>,
        OrderedStage<QueriedTables, AliasedColumnsIn<Selection>, RowTypeFrom<Selection>> {
    constructor(
        private databaseHandle: DatabaseHandle,
        private primaryTable: PropOf<QueriedTables>,
        private allTables: QueriedTables,
        private selection: Selection,
        private filter?: any,
        private query?: QueryData<Selection>,
    ) {}

    private withQuery(
        f: (oldQuery: QueryData<Selection>) => QueryData<Selection>,
    ): SelectedImpl<QueriedTables, Selection> {
        return new SelectedImpl(
            this.databaseHandle,
            this.primaryTable,
            this.allTables,
            this.filter,
            f(this.query ?? { orderBy: [] }),
        )
    }

    thenBy(
        column: ColumnIn<QueriedTables> | keyof AliasedColumnsIn<Selection>,
        direction?: "ASC" | "DESC",
    ): OrderedStage<QueriedTables, AliasedColumnsIn<Selection>, RowTypeFrom<Selection>> {
        return this.withQuery(q => ({ ...q, orderBy: [...q.orderBy, { column, direction }] }))
    }

    orderBy(
        column: ColumnIn<QueriedTables> | keyof AliasedColumnsIn<Selection>,
        direction?: "ASC" | "DESC",
    ): OrderedStage<QueriedTables, AliasedColumnsIn<Selection>, RowTypeFrom<Selection>> {
        return this.thenBy(column, direction)
    }

    limit(limit: number): OffsetStage<AliasedColumnsIn<Selection>, RowTypeFrom<Selection>> {
        return this.withQuery(q => ({ ...q, limit }))
    }
    offset(offset: number): FetchStage<AliasedColumnsIn<Selection>, RowTypeFrom<Selection>> {
        return this.withQuery(q => ({ ...q, offset }))
    }

    async fetch(): Promise<RowTypeFrom<Selection>[]> {
        const selectionsSql = traverseSelection(this.selection, (keyPath, col) =>
            columnDefinitionSql(col, keyPath.length === 1 ? keyPath[0] : null),
        ).join(",")

        const selectionDestinations = traverseSelection(this.selection, keyPath => keyPath)

        // TODO from all the tables, implement joins
        const columnsInPrimaryTable = Object.values(this.primaryTable)
        if (columnsInPrimaryTable.length === 0) throw Error("Primary table has no columns")
        const { tableOrigin, tableAlias } = Object.values(this.primaryTable)[0]
        const tableOriginSql =
            tableOrigin.type === "table"
                ? tableOrigin.name.map(renderIdentifier).join(".")
                : `(${tableOrigin.query.renderSql()})`
        const fromSql = `${tableOriginSql} AS ${renderIdentifier(tableAlias)}`

        const rows = await this.databaseHandle.fetch(
            `SELECT ${selectionsSql} FROM ${fromSql}${whereSql(this.filter)}${orderLimitOffsetSql(this.query)}`,
        )

        return rows.map(row => {
            let rowObject: any = {}
            for (let i = 0; i < row.length; i++) {
                rowObject = populateAtPath(rowObject, selectionDestinations[i], row[i])
            }
            return rowObject
        })
    }

    asTable<Alias extends string>(
        alias: Alias,
    ): {
        [ColumnAlias in keyof AliasedColumnsIn<Selection> & string]: ColumnDefinition<
            SubqueryOrigin,
            AliasedColumnsIn<Selection>[ColumnAlias],
            Alias,
            ColumnAlias,
            unknown
        >
    } {
        const cols = Object.entries(this.selection)
        const newCols: [string, ColumnDefinition<SubqueryOrigin, SqlType, Alias, string, undefined>][] = cols
            .filter(([_, def]) => COLUMN_DEFINITION in def)
            .map(([name, def]) => {
                const oldDef = def as ColumnDefinition<Origin, SqlType>
                const newDef = {
                    [COLUMN_DEFINITION]: true,
                    tableOrigin: { type: "subquery", query: { renderSql: () => "hello world" } },
                    tableAlias: alias,
                    columnName: name,
                    sqlType: oldDef.sqlType,
                    references: undefined,
                } as const
                return [name, newDef]
            })
        return Object.fromEntries(newCols) as any
    }
}

class SingleTableImpl<QueriedTable extends TableDefinition<Origin, string>, Selection = QueriedTable>
    implements
        TableStage<QueriedTable>,
        TableFilteredStage<QueriedTable>,
        OrderedStage<
            QueriedTablesFromSingle<QueriedTable>,
            DefaultSelectionFromSingle<QueriedTable>, // TODO are these right? what if the user made a selection?
            RowTypeFrom<Selection>
        > {
    tableName: string

    constructor(
        private databaseHandle: DatabaseHandle,
        private table: QueriedTable,
        private filter?: any,
        private query?: QueryData<Selection>,
    ) {
        const tableName = Object.values(table).shift()?.tableOrigin
        if (tableName === undefined) throw Error("table must have at least one column")
        this.tableName = tableName
    }

    insert(row: RowTypeFrom<QueriedTable>): Promise<ExecResult> {
        // TODO: ensure that no other methods were called
        const columnNames = Object.keys(row)
        for (const columnName of columnNames) {
            if (!(columnName in this.table)) {
                throw Error(`column ${columnName} not found in table ${this.tableName}`)
            }
        }
        if (columnNames.length === 0) {
            return this.databaseHandle.execute(`INSERT INTO ${this.table} DEFAULT VALUES`)
        } else {
            const tableNameSql = renderIdentifier(this.tableName)
            const columnsSql = columnNames.map(renderIdentifier).join(",")
            const valuesSql = Object.values(row).map(renderLiteral).join(",")
            return this.databaseHandle.execute(`INSERT INTO ${tableNameSql} (${columnsSql}) VALUES (${valuesSql})`)
        }
    }

    update(row: Partial<RowTypeFrom<QueriedTable>>): Promise<ExecResult> {
        const tableNameSql = renderIdentifier(this.tableName)
        const updateSql = Object.entries(row)
            .map(([key, value]) => `${renderIdentifier(key)} = ${renderLiteral(value)}`)
            .join(",")
        return this.databaseHandle.execute(`UPDATE ${tableNameSql} SET ${updateSql}${whereSql(this.filter)}`)
    }

    delete(): Promise<ExecResult> {
        const tableNameSql = renderIdentifier(this.tableName)
        return this.databaseHandle.execute(`DELETE FROM ${tableNameSql}${whereSql(this.filter)}`)
    }

    or(match: Predicate<Row>): FilteredTable<TableName, Row> {
        if (this.filter === undefined) {
            throw Error("DSL misuse: called or before where")
        }
        throw new Error("Method not implemented.")
    }

    where(column: any, operator?: any, value?: any): FilteredTable<TableName, Row> {
        throw new Error("Method not implemented.")
    }

    select<Selection extends SelectionFrom<Record<PropOf<QueriedTable>["tableAlias"], QueriedTable>>>(
        selection: Selection,
    ) {
        return this.withQuery(q => ({ ...q, selection }))
    }

    orderBy(
        column: ColumnIn<QueriedTablesFromSingle<QueriedTable>> | keyof AliasedColumnsIn<Selection>,
        direction?: "ASC" | "DESC",
    ): OrderedStage<QueriedTablesFromSingle<QueriedTable>, AliasedColumnsIn<Selection>, RowTypeFrom<QueriedTable>> {
        return this.thenBy(column, direction)
    }

    thenBy(
        column: ColumnIn<QueriedTablesFromSingle<QueriedTable>> | keyof AliasedColumnsIn<Selection>,
        direction?: "ASC" | "DESC",
    ): OrderedStage<QueriedTablesFromSingle<QueriedTable>, AliasedColumnsIn<Selection>, RowTypeFrom<QueriedTable>> {
        return this.withQuery(q => ({ ...q, orderBy: [...q.orderBy, { column, direction }] }))
    }

    limit(
        limit: number,
    ): OffsetStage<
        { [ColumnName in keyof QueriedTable]: QueriedTable[ColumnName]["sqlType"] },
        RowTypeFrom<QueriedTable>
    > {
        return this.withQuery(q => ({ ...q, limit }))
    }

    offset(
        offset: number,
    ): FetchStage<
        { [ColumnName in keyof QueriedTable]: QueriedTable[ColumnName]["sqlType"] },
        RowTypeFrom<QueriedTable>
    > {
        return this.withQuery(q => ({ ...q, offset }))
    }

    private withQuery<QueriedTables>(
        f: (oldQuery: QueryData<QueriedTables>) => QueryData<QueriedTables>,
    ): SingleTableImpl<QueriedTable> {
        return new SingleTableImpl(this.databaseHandle, this.table, this.filter, f(this.query ?? { orderBy: [] }))
    }
}

function populateAtPath(object: any, path: string[], value: unknown) {
    if (path.length === 0) {
        return value
    } else if (path.length === 1) {
        object[path[0]] = value
        return object
    } else {
        let subObject: any
        if (path[0] in object) {
            subObject = object[path[0]]
        } else {
            subObject = {}
            object[path[0]] = subObject
        }
        path.shift()
        populateAtPath(subObject, path, value)
        return object
    }
}

function traverseSelection<T>(
    selection: any,
    func: (keyPath: string[], columnDefinition: ColumnDefinition<Origin, unknown>) => T,
    keyPathPrefix: string[] = [],
): T[] {
    if (COLUMN_DEFINITION in selection) {
        return [func(keyPathPrefix, selection as ColumnDefinition<Origin, unknown>)]
    } else if (RAW_SQL in selection) {
        // TODO handle raw sql
        throw Error("raw sql not supported yet")
    } else {
        return Object.entries(selection).flatMap(([key, s]) => traverseSelection(s, func, keyPathPrefix.concat([key])))
    }
}

function columnDefinitionSql(columnDef: ColumnDefinition<Origin, unknown>, alias: string | null) {
    //  is render identifier correct for aliases?
    const aliasSql = alias === null ? "" : ` AS ${renderIdentifier(alias)}`
    return `${renderIdentifier(columnDef.tableAlias)}.${renderIdentifier(columnDef.columnName)}${aliasSql}`
}

function orderLimitOffsetSql(query?: QueryData<unknown>) {
    if (query === undefined) return ""
    let sql = ""
    if (query.orderBy.length > 0) {
        const orderBySql = query.orderBy.map(
            entry =>
                `${renderIdentifier(entry.column.tableAlias)}.${renderIdentifier(entry.column.columnName)}${
                    entry.direction === undefined ? "" : " " + entry.direction
                }`,
        )
        sql += ` ORDER BY ${orderBySql}`
    }
    if (query.limit !== undefined) {
        sql += ` LIMIT ${renderLiteral(query.limit)}`
    }
    if (query.offset !== undefined) {
        sql += ` OFFSET ${renderLiteral(query.offset)}`
    }
    return sql
}
