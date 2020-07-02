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
    TableFilterableStage,
    JoinedBeforeOnStage,
    JoinedAfterOnStage,
    TableSelectStage,
} from "./stages"
import { TableDefinition, ColumnDefinition, Origin, SubqueryOrigin, SqlType } from "./definitions"
import { COLUMN_DEFINITION, RAW_SQL } from "./symbols"
import { size, orderBy } from "lodash"

interface DatabaseHandle {
    execute(sql: string): Promise<ExecResult>
    fetch(sql: string): Promise<any[][]>
}

function renderIdentifier(identifier: string) {
    // TODO
    return identifier
}

function renderLiteral(literalValue: unknown) {
    // TODO
    return literalValue
}

interface OrderLimitOffset<Selection> {
    limit?: number
    offset?: number
    orderBy: {
        column: keyof AliasedColumnsIn<Selection> | ColumnDefinition<Origin, unknown> // TODO are these type arguments right?
        direction?: "ASC" | "DESC"
    }[]
}

// class SelectedImpl<QueriedTables extends TableDefinitions, Selection>
//     implements
//         OrderStage<QueriedTables, AliasedColumnsIn<Selection>, RowTypeFrom<Selection>>,
//         OrderedStage<QueriedTables, AliasedColumnsIn<Selection>, RowTypeFrom<Selection>> {
//     constructor(
//         private databaseHandle: DatabaseHandle,
//         private primaryTable: PropOf<QueriedTables>,
//         private allTables: QueriedTables,
//         private selection: Selection,
//         private filter?: any,
//         private query?: QueryData<Selection>,
//     ) {}

//     private withQuery(
//         f: (oldQuery: QueryData<Selection>) => QueryData<Selection>,
//     ): SelectedImpl<QueriedTables, Selection> {
//         return new SelectedImpl(
//             this.databaseHandle,
//             this.primaryTable,
//             this.allTables,
//             this.filter,
//             f(this.query ?? { orderBy: [] }),
//         )
//     }

// }

interface Filter {
    type: "filter"
    first: Filter | FilterElement | true
    rest: ["and" | "or", Filter | FilterElement | true][]
}

interface FilterElement {
    type: "element"
    left: Expression
    op: SqlOperator
    right: Expression
}

const sqlOperators = ["==", "<>"] as const
type SqlOperator = typeof sqlOperators[number]

type Expression =
    | { type: "literal"; literal: unknown }
    | { type: "column"; definition: ColumnDefinition<Origin, SqlType> }

interface StageState<Selection> {
    databaseHandle: DatabaseHandle
    primaryTable: TableDefinition
    joinedTablesByAlias: Record<string, TableDefinition>
    joinFiltersByAlias: Record<string, Filter>
    currentlyJoiningAgainstAlias?: string
    filter?: Filter
    orderLimitOffset: OrderLimitOffset<Selection>
}

class StageBackend<QueriedTables extends TableDefinitions, Selection = QueriedTables> {
    selection: Selection
    primaryTableAlias: string
    primaryTableName: string[]
    constructor(public state: StageState<Selection>, selection: Selection | null) {
        // TODO: create "unsafe" constructor for use when copying this class to make the builder cheaper
        const primaryTableColumns = Object.values(state.primaryTable)
        if (primaryTableColumns.length === 0) {
            throw Error("table has zero columns")
        }
        if (primaryTableColumns[0].tableOrigin.type !== "table") {
            throw Error("not a real table")
        }
        this.primaryTableAlias = primaryTableColumns[0].tableAlias
        this.primaryTableName = primaryTableColumns[0].tableOrigin.name
        this.selection =
            selection ??
            (((size(state.joinedTablesByAlias) === 0
                ? state.primaryTable
                : {
                      ...state.joinedTablesByAlias,
                      [this.primaryTableAlias]: state.primaryTable,
                  }) as unknown) as Selection)
    }

    where = (...args: {}[]): any => {
        return this.withWhereFilter(f => {
            if (f === undefined) {
                return parseFilterArgs(this.selection, args)
            } else {
                throw Error("DSL misuse: where called multiple times")
            }
        })
    }

    on = (...args: {}[]): any => {
        return this.withJoinFilter(f => {
            if (f === undefined) {
                return parseFilterArgs(this.selection, args)
            } else {
                throw Error("DSL misuse: on called multiple times")
            }
        })
    }

    and = (...args: {}[]): any => {
        return this.andOr("and", args)
    }

    or = (...args: {}[]): any => {
        return this.andOr("or", args)
    }

    private andOr = (connective: "and" | "or", ...args: {}[]): any => {
        return this.withFilter(f => {
            if (f === undefined) {
                throw Error(`DSL misuse: ${connective} called before where/join`)
            } else {
                return { ...f, rest: [...f.rest, [connective, parseFilterArgs(this.selection, args)]] }
            }
        })
    }

    private withFilter = (f: (oldFilter?: Filter) => Filter) => {
        return this.state.currentlyJoiningAgainstAlias === undefined ? this.withWhereFilter(f) : this.withJoinFilter(f)
    }

    private withWhereFilter = (f: (oldFilter?: Filter) => Filter) => {
        return new StageBackend({ ...this.state, filter: f(this.state.filter) }, this.selection)
    }

    private withJoinFilter = (f: (oldFilter?: Filter) => Filter) => {
        if (this.state.currentlyJoiningAgainstAlias === undefined) {
            throw new Error("on/and/or clause used prior to join")
        }
        return new StageBackend(
            {
                ...this.state,
                joinFiltersByAlias: {
                    ...this.state.joinFiltersByAlias,
                    [this.state.currentlyJoiningAgainstAlias]: f(
                        this.state.joinFiltersByAlias[this.state.currentlyJoiningAgainstAlias],
                    ),
                },
            },
            this.selection,
        )
    }

    join = (_otherTable: TableDefinition) => {
        throw new Error("TODO: support auto joins")
        return new StageBackend(this.state, this.selection)
    }

    innerJoin = (otherTable: TableDefinition) => {
        const columns = Object.values(otherTable)
        if (columns.length === 0) {
            throw new Error("joined table has zero columns")
        }
        const tableAlias = columns[0].tableAlias
        if (tableAlias === this.primaryTableAlias) {
            throw new Error("joined table has same alias as initial table")
        }
        if (tableAlias in this.state.joinedTablesByAlias) {
            throw new Error("joined table has same alias as another joined table")
        }
        return new StageBackend(
            {
                ...this.state,
                joinedTablesByAlias: { ...this.state.joinedTablesByAlias, [tableAlias]: otherTable },
                currentlyJoiningAgainstAlias: tableAlias,
            },
            this.selection,
        )
    }

    select = <Selection extends SelectionFrom<QueriedTables>>(selection: Selection) => {
        // cast of this.state is fine because state cannot contain order-limit-offset prior to selection
        return new StageBackend<QueriedTables, Selection>(this.state as StageState<Selection>, selection)
    }

    orderBy = (column: ColumnIn<QueriedTables> | keyof AliasedColumnsIn<Selection>, direction?: "ASC" | "DESC") => {
        return this.thenBy(column, direction)
    }

    thenBy = (column: ColumnIn<QueriedTables> | keyof AliasedColumnsIn<Selection>, direction?: "ASC" | "DESC") => {
        return this.withOrderLimitOffset(olo => ({ ...olo, orderBy: [...olo.orderBy, { column, direction }] }))
    }

    limit = (limit: number) => {
        return this.withOrderLimitOffset(olo => ({ ...olo, limit }))
    }
    offset = (offset: number) => {
        return this.withOrderLimitOffset(olo => ({ ...olo, offset }))
    }

    private withOrderLimitOffset = (
        f: (oldOrderLimitOffset: OrderLimitOffset<Selection>) => OrderLimitOffset<Selection>,
    ) => {
        return new StageBackend({ ...this.state, orderLimitOffset: f(this.state.orderLimitOffset) }, this.selection)
    }

    private renderSql = () => {
        const selectionsSql = traverseSelection(this.selection, (keyPath, col) =>
            columnDefinitionSql(col, keyPath.length === 1 ? keyPath[0] : null),
        ).join(",")

        // TODO from all the tables, implement joins
        const columnsInPrimaryTable = Object.values(this.primaryTable)
        if (columnsInPrimaryTable.length === 0) throw Error("Primary table has no columns")
        const { tableOrigin, tableAlias } = Object.values(this.primaryTable)[0]
        const tableOriginSql =
            tableOrigin.type === "table"
                ? tableOrigin.name.map(renderIdentifier).join(".")
                : `(${tableOrigin.query.renderSql()})`
        const fromSql = `${tableOriginSql} AS ${renderIdentifier(tableAlias)}`

        return `SELECT ${selectionsSql} FROM ${fromSql}${whereSql(this.filter)}${orderLimitOffsetSql(this.query)}`
    }

    fetch = async (): Promise<RowTypeFrom<Selection>[]> => {
        const sql = this.renderSql()
        const selectionDestinations = traverseSelection(this.selection, keyPath => keyPath)
        const rows = await this.state.databaseHandle.fetch(sql)
        return rows.map(row => {
            let rowObject: any = {}
            for (let i = 0; i < row.length; i++) {
                rowObject = populateAtPath(rowObject, selectionDestinations[i], row[i])
            }
            return rowObject
        })
    }

    asTable = <Alias extends string>(
        alias: Alias,
    ): {
        [ColumnAlias in keyof AliasedColumnsIn<Selection> & string]: ColumnDefinition<
            SubqueryOrigin,
            AliasedColumnsIn<Selection>[ColumnAlias],
            Alias,
            ColumnAlias,
            unknown
        >
    } => {
        const cols = Object.entries(this.selection)
        const newCols: [string, ColumnDefinition<SubqueryOrigin, SqlType, Alias, string, undefined>][] = cols
            .filter(([_, def]) => COLUMN_DEFINITION in def)
            .map(([name, def]) => {
                const oldDef = def as ColumnDefinition<Origin, SqlType>
                const newDef = {
                    [COLUMN_DEFINITION]: true,
                    tableOrigin: { type: "subquery", query: { renderSql: () => this.renderSql() } },
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

class SelectedStageImpl<QueriedTables extends TableDefinitions, Selection>
    implements OrderStage<QueriedTables, AliasedColumnsIn<Selection>, RowTypeFrom<Selection>> {
    constructor(private backend: StageBackend<QueriedTables, Selection>) {}

    private attach = <Q extends TableDefinitions, S, T extends unknown[]>(f: (...args: T) => StageBackend<Q, S>) => (
        ...args: T
    ) => new SelectedStageImpl(f(...args))

    orderBy = this.attach(this.backend.orderBy)
    thenBy = this.attach(this.backend.thenBy)
    limit = this.attach(this.backend.limit)
    offset = this.attach(this.backend.offset)
    fetch = this.backend.fetch
    asTable = this.backend.asTable
}

class SingleTableStageImpl<QueriedTable extends TableDefinition>
    implements TableSelectStage<QueriedTable>, TableStage<QueriedTable> {
    constructor(private backend: StageBackend<QueriedTablesFromSingle<QueriedTable>, QueriedTable>) {}

    private attach = <T extends unknown[]>(
        f: (...args: T) => StageBackend<QueriedTablesFromSingle<QueriedTable>, QueriedTable>,
    ) => (...args: T) => new SingleTableStageImpl<QueriedTable>(f(...args))

    private attachTo = <R, T extends unknown[]>(
        ctor: new (newBackend: StageBackend<QueriedTablesFromSingle<QueriedTable>, QueriedTable>) => R,
        f: (...args: T) => StageBackend<QueriedTablesFromSingle<QueriedTable>, QueriedTable>,
    ) => (...args: T) => new ctor(f(...args))

    where = this.attach(this.backend.where)
    and = this.attach(this.backend.and)
    or = this.attach(this.backend.or)
    join = this.attachTo(this.backend.join)
    innerJoin = this.attach(this.backend.innerJoin)
    orderBy = this.attach(this.backend.orderBy)
    thenBy = this.attach(this.backend.thenBy)
    limit = this.attach(this.backend.limit)
    offset = this.attach(this.backend.offset)
    select = <Selection extends SelectionFrom<QueriedTablesFromSingle<QueriedTable>>>(selection: Selection) => {
        return new SelectedStageImpl(this.backend.select(selection))
    }
    fetch = this.backend.fetch
    asTable = this.backend.asTable

    insert = (row: RowTypeFrom<QueriedTable>): Promise<ExecResult> => {
        const {
            state: { primaryTable, databaseHandle },
            primaryTableAlias,
            primaryTableName,
        } = this.backend
        const columnNames = Object.keys(row)
        for (const columnName of columnNames) {
            if (!(columnName in primaryTable)) {
                throw Error(`column ${columnName} not found in table with alias ${primaryTableAlias}`)
            }
        }
        const tableNameSql = primaryTableName.map(renderIdentifier).join(",")
        if (columnNames.length === 0) {
            return databaseHandle.execute(`INSERT INTO ${tableNameSql} DEFAULT VALUES`)
        } else {
            const columnsSql = columnNames.map(renderIdentifier).join(",")
            const valuesSql = Object.values(row).map(renderLiteral).join(",")
            return databaseHandle.execute(`INSERT INTO ${tableNameSql} (${columnsSql}) VALUES (${valuesSql})`)
        }
    }

    update = (row: Partial<RowTypeFrom<QueriedTable>>): Promise<ExecResult> => {
        const {
            state: { filter, databaseHandle },
            primaryTableName,
        } = this.backend

        const tableNameSql = primaryTableName.map(renderIdentifier).join(",")
        const updateSql = Object.entries(row)
            .map(([key, value]) => `${renderIdentifier(key)} = ${renderLiteral(value)}`)
            .join(",")
        return databaseHandle.execute(`UPDATE ${tableNameSql} SET ${updateSql}${whereSql(filter)}`)
    }

    delete = (): Promise<ExecResult> => {
        const {
            state: { filter, databaseHandle },
            primaryTableName,
        } = this.backend
        const tableNameSql = primaryTableName.map(renderIdentifier).join(",")
        return databaseHandle.execute(`DELETE FROM ${tableNameSql}${whereSql(filter)}`)
    }
}

function parseFilterArgs(defaultSelection: any, args: {}[]): Filter {
    if (args.length === 1) {
        if (typeof args[0] === "function") {
            throw Error("TODO: where builder function")
        } else if (typeof args[0] === "object") {
            return parseMatcher(defaultSelection, args[0])
        } else {
            throw Error("unexpected single argument of type " + typeof args[0])
        }
    } else if (args.length === 3) {
        return { type: "filter", first: parseWhereClause(args[0], args[1], args[2]), rest: [] }
    } else {
        throw Error("DSL misuse: invalid where clause")
    }
}

function parseWhereClause(left: {}, operator: {}, right: {}): FilterElement {
    if (!sqlOperators.includes(operator as any)) throw Error("unsupported operator " + operator)
    return {
        type: "element",
        left:
            COLUMN_DEFINITION in left
                ? { type: "column", definition: left as ColumnDefinition<Origin, SqlType> }
                : { type: "literal", literal: left },
        op: operator as SqlOperator,
        right:
            COLUMN_DEFINITION in right
                ? { type: "column", definition: right as ColumnDefinition<Origin, SqlType> }
                : { type: "literal", literal: right },
    }
}

function parseMatcher(defaultSelection: any, matcher: {}): Filter {
    const elements = parseMatcherIntoFilterElements(defaultSelection, matcher)
    const first = elements.shift() || true
    return { type: "filter", first, rest: elements.map(e => ["and", e]) }
}

function parseMatcherIntoFilterElements(defaultSelection: any, matcher: {}): FilterElement[] {
    if (COLUMN_DEFINITION in defaultSelection) {
        return [
            {
                type: "element",
                left: { type: "column", definition: defaultSelection },
                op: "==",
                right: { type: "literal", literal: matcher },
            },
        ]
    } else {
        return Object.entries(matcher).flatMap(([key, subMatcher]) => {
            if (key in defaultSelection) {
                return parseMatcherIntoFilterElements(defaultSelection[key], subMatcher as {})
            } else {
                throw Error(`Key ${key} in matcher not found in selected tables`)
            }
        })
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
    tableOrigin: Origin
    tableAlias: string

    constructor(private databaseHandle: DatabaseHandle, private table: QueriedTable, private filter?: any) {
        const firstColumn = Object.values(table).shift()
        if (firstColumn === undefined) throw Error("table must have at least one column")
        this.tableOrigin = firstColumn.tableOrigin
        this.tableAlias = firstColumn.tableAlias
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

    select<Selection extends SelectionFrom<QueriedTablesFromSingle<QueriedTable>>>(selection: Selection) {
        return new SelectedImpl(
            this.databaseHandle,
            this.table,
            { [this.tableAlias]: this.table },
            selection,
            this.filter,
        )
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
    ): SingleStageImpl<QueriedTable> {
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
