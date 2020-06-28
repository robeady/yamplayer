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
} from "./stages"
import { TableDefinition, ColumnDefinition } from "./definitions"
import { mapValues } from "lodash"
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

type Selection =
    | { type: "column"; definition: ColumnDefinition<string | undefined, unknown> } // TODO: can this really be from a non-real table?
    | { type: "literal"; literal: unknown }

interface QueryData<QueriedTables> {
    selection?: SelectionFrom<QueriedTables>
    limit?: number
    offset?: number
    orderBy: {
        column: ColumnDefinition<string, unknown> // TODO are these type arguments right?
        direction?: "ASC" | "DESC"
    }[]
}

type QueriedTablesFrom<QueriedTable extends TableDefinition<string | undefined, string>> = Record<
    PropOf<QueriedTable>["tableAlias"],
    QueriedTable
>

type SelectedColumnsFrom<QueriedTable extends TableDefinition<string | undefined, string>> = {
    [ColumnName in keyof QueriedTable]: QueriedTable[ColumnName]["sqlType"]
}

// type OutputRowFrom<QueriedTable extends TableDefinition<string | undefined, string>> = RowTypeFrom<{}, QueriedTable>

class SingleTableImpl<QueriedTable extends TableDefinition<string | undefined, string>>
    implements
        TableStage<QueriedTable>,
        TableFilteredStage<QueriedTable>,
        OrderedStage<
            QueriedTablesFrom<QueriedTable>,
            SelectedColumnsFrom<QueriedTable>, // TODO are these right? what if the user made a selection?
            RowTypeFrom<QueriedTable>
        > {
    tableName: string

    constructor(
        private databaseHandle: DatabaseHandle,
        private table: QueriedTable,
        private filter?: any,
        private query?: QueryData<QueriedTablesFrom<QueriedTable>>,
    ) {
        const tableName = Object.values(table).shift()?.tableName
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
        column: ColumnIn<QueriedTablesFrom<QueriedTable>> | keyof SelectedColumnsFrom<QueriedTable>,
        direction?: "asc" | "desc",
    ): OrderedStage<QueriedTablesFrom<QueriedTable>, SelectedColumnsFrom<QueriedTable>, RowTypeFrom<QueriedTable>> {
        return this.thenBy(column, direction)
    }

    thenBy(
        column: ColumnIn<QueriedTablesFrom<QueriedTable>> | keyof SelectedColumnsFrom<QueriedTable>,
        direction?: "asc" | "desc",
    ): OrderedStage<QueriedTablesFrom<QueriedTable>, SelectedColumnsFrom<QueriedTable>, RowTypeFrom<QueriedTable>> {
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

    async fetch(): Promise<RowTypeFrom<QueriedTable>[]> {
        const selection =
            this.query?.selection ?? mapValues(this.table, definition => ({ type: "column", definition } as const))

        const selectionsSql = traverseSelection(selection, (keyPath, col) =>
            columnDefinitionSql(col, keyPath.length === 1 ? keyPath[0] : null),
        ).join(",")

        const selectionDestinations = traverseSelection(selection, keyPath => keyPath)

        const fromSql = renderIdentifier(this.tableName)

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
    func: (keyPath: string[], columnDefinition: ColumnDefinition<string, unknown>) => T,
    keyPathPrefix: string[] = [],
): T[] {
    if (COLUMN_DEFINITION in selection) {
        return [func(keyPathPrefix, selection as ColumnDefinition<string, unknown>)]
    } else if (RAW_SQL in selection) {
        // TODO handle raw sql
        throw Error("raw sql not supported yet")
    } else {
        return Object.entries(selection).flatMap(([key, s]) => traverseSelection(s, func, keyPathPrefix.concat([key])))
    }
}

function columnDefinitionSql(columnDef: ColumnDefinition<string, unknown>, alias: string | null) {
    //  is render identifier correct for aliases?
    const aliasSql = alias === null ? "" : ` AS ${renderIdentifier(alias)}`
    return `${renderIdentifier(columnDef.tableAlias)}.${renderIdentifier(columnDef.columnName)}${aliasSql}`
}

function orderLimitOffsetSql(query?: QueryData<unknown>) {
    if (query === undefined) return ""
    let sql = ""
    if (query.orderBy.length > 0) {
        // TODO: is it correct to use/assume table name here?
        const orderBySql = query.orderBy.map(
            entry =>
                `${renderIdentifier(entry.column.tableName)}.${renderIdentifier(entry.column.columnName)}${
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
