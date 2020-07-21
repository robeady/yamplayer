import {
    ExecResult,
    RowTypeFrom,
    ColumnIn,
    SelectionFrom,
    QueriedTablesFromSingle,
    AliasIn,
    TableDefinitions,
    OrderStage,
    InsertStage,
    OnStage,
    KeyByAlias,
    ColumnsFrom,
} from "./stages"
import { TableDefinition, ColumnDefinition, Origin, SubqueryOrigin, SqlType, RealTableOrigin } from "./definitions"
import { COLUMN_DEFINITION, RAW_SQL } from "./symbols"
import { size } from "lodash"

export function queryBuilder(databaseHandle: DatabaseHandle): <T extends TableDefinition>(table: T) => InsertStage<T> {
    return <T extends TableDefinition>(table: T) => {
        return new SingleTableStageImpl<T>(
            new StageBackend(
                {
                    databaseHandle,
                    primaryTable: table,
                    joinedTablesByAlias: {},
                    joinFiltersByAlias: {},
                    orderLimitOffset: { orderBy: [] },
                },
                null as any,
            ),
        )
    }
}

export const noDatabaseHandle: DatabaseHandle = {
    execute: () => {
        throw Error("no database")
    },
    query: () => {
        throw Error("no database")
    },
}

export interface DatabaseHandle {
    execute(sql: string): Promise<ExecResult>
    query(sql: string): Promise<unknown[][]>
}

export function renderIdentifier(identifier: string): string {
    if (identifier.includes("`")) {
        throw Error("identifiers may not contain backticks")
    }
    return "`" + identifier + "`"
}

export function renderLiteral(literalValue: unknown): string {
    // TODO
    if (literalValue === null) {
        return "NULL"
    } else if (typeof literalValue === "boolean") {
        return literalValue ? "TRUE" : "FALSE"
    } else if (typeof literalValue === "number" || typeof literalValue === "bigint") {
        return literalValue.toString()
    } else if (typeof literalValue === "string") {
        return "'" + literalValue + "'"
    } else {
        throw Error("invalid literal " + literalValue)
    }
}

interface OrderLimitOffset {
    limit?: number
    offset?: number
    orderBy: {
        column: string | ColumnDefinition<Origin, SqlType> // TODO are these type arguments right?
        direction?: "ASC" | "DESC"
    }[]
}

interface Filter {
    type: "filter"
    first: Filter | FilterElement | boolean
    rest: ["and" | "or", Filter | FilterElement | boolean][]
}

interface FilterElement {
    type: "element"
    left: Expression
    op: SqlOperator
    right: Expression
}

const sqlOperators = ["=", "<>"] as const
type SqlOperator = typeof sqlOperators[number]

type Expression =
    | { type: "literal"; literal: unknown }
    | { type: "column"; definition: ColumnDefinition<Origin, SqlType> }

type JoinType = "inner"

interface JoinInfo {
    joinedTablesByAlias: Record<string, [JoinType, TableDefinition]>
    joinFiltersByAlias: Record<string, Filter>
}

interface StageState extends JoinInfo {
    databaseHandle: DatabaseHandle
    primaryTable: TableDefinition
    currentlyJoiningAgainstAlias?: string
    filter?: Filter
    orderLimitOffset: OrderLimitOffset
}

class StageBackend<QueriedTables extends TableDefinitions, Selection> {
    selection: Selection
    primaryTableAlias: string
    primaryTableName: string[]
    constructor(public state: StageState, selection: Selection | null) {
        // TODO: create "unsafe" constructor for use when copying this class to make the builder cheaper
        const primaryTableDetails = tableDetails(state.primaryTable)
        if (primaryTableDetails.tableOrigin.type !== "table") {
            throw Error("not a real table")
        }
        this.primaryTableAlias = primaryTableDetails.tableAlias
        this.primaryTableName = primaryTableDetails.tableOrigin.name
        this.selection =
            selection ??
            (((size(state.joinedTablesByAlias) === 0
                ? state.primaryTable
                : {
                      ...state.joinedTablesByAlias,
                      [this.primaryTableAlias]: state.primaryTable,
                  }) as unknown) as Selection)
    }

    where = (...args: {}[]) => {
        return this.withWhereFilter(f => {
            if (f === undefined) {
                return parseFilterArgs(this.selection, args)
            } else {
                throw Error("DSL misuse: where called multiple times")
            }
        })
    }

    on = (...args: {}[]) => {
        return this.withJoinFilter(f => {
            if (f === undefined) {
                return parseFilterArgs(this.selection, args)
            } else {
                throw Error("DSL misuse: on called multiple times")
            }
        })
    }

    and = (...args: {}[]) => {
        return this.andOr("and", args)
    }

    or = (...args: {}[]) => {
        return this.andOr("or", args)
    }

    private andOr = (connective: "and" | "or", ...args: {}[]) => {
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
        return new StageBackend<QueriedTables, Selection>(
            { ...this.state, filter: f(this.state.filter) },
            this.selection,
        )
    }

    private withJoinFilter = (f: (oldFilter?: Filter) => Filter) => {
        if (this.state.currentlyJoiningAgainstAlias === undefined) {
            throw new Error("on/and/or clause used prior to join")
        }
        return new StageBackend<QueriedTables, Selection>(
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

    innerJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) => {
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
        return new StageBackend<QueriedTables & KeyByAlias<OtherTable>, QueriedTables & KeyByAlias<OtherTable>>(
            {
                ...this.state,
                joinedTablesByAlias: { ...this.state.joinedTablesByAlias, [tableAlias]: ["inner", otherTable] },
                currentlyJoiningAgainstAlias: tableAlias,
                // clear some params explicitly (although they shouldn't be set) so the types work out
                orderLimitOffset: { orderBy: [] },
            },
            null,
        )
    }

    select = <Selection extends SelectionFrom<QueriedTables>>(selection: Selection) => {
        return new StageBackend<QueriedTables, Selection>(
            { ...this.state, orderLimitOffset: { orderBy: [] } },
            selection,
        )
    }

    orderBy = (column: ColumnIn<QueriedTables> | AliasIn<Selection>, direction?: "ASC" | "DESC") => {
        return this.thenBy(column, direction)
    }

    thenBy = (column: ColumnIn<QueriedTables> | AliasIn<Selection>, direction?: "ASC" | "DESC") => {
        return this.withOrderLimitOffset(olo => ({ ...olo, orderBy: [...olo.orderBy, { column, direction }] }))
    }

    limit = (limit: number) => {
        return this.withOrderLimitOffset(olo => ({ ...olo, limit }))
    }
    offset = (offset: number) => {
        return this.withOrderLimitOffset(olo => ({ ...olo, offset }))
    }

    private withOrderLimitOffset = (f: (oldOrderLimitOffset: OrderLimitOffset) => OrderLimitOffset) => {
        return new StageBackend<QueriedTables, Selection>(
            { ...this.state, orderLimitOffset: f(this.state.orderLimitOffset) },
            this.selection,
        )
    }

    render = () => {
        const selectionsSql = traverseSelection(this.selection, (keyPath, col) =>
            columnDefinitionSql(col, keyPath.length === 1 ? keyPath[0] : undefined),
        ).join(", ")

        const selectionDestinations = traverseSelection(this.selection, keyPath => keyPath)

        // TODO from all the tables, implement joins
        const columnsInPrimaryTable = Object.values(this.state.primaryTable)
        if (columnsInPrimaryTable.length === 0) throw Error("Primary table has no columns")
        const { tableOrigin, tableAlias } = Object.values(this.state.primaryTable)[0]
        const tableOriginSql =
            tableOrigin.type === "table" ? realTableSql(tableOrigin) : `(${tableOrigin.render().sql})`
        const fromSql = `${tableOriginSql} AS ${renderIdentifier(tableAlias)}`

        const sql = `SELECT ${selectionsSql} FROM ${fromSql}${joinSql(this.state)}${whereSql(
            this.state.filter,
        )}${orderLimitOffsetSql(this.state.orderLimitOffset)}`

        const mapRow = (row: unknown[]) => {
            let rowObject: any = {}
            for (let i = 0; i < row.length; i++) {
                rowObject = populateAtPath(rowObject, selectionDestinations[i], row[i])
            }
            return rowObject
        }

        return { sql, mapRow }
    }

    fetch = async (): Promise<RowTypeFrom<Selection>[]> => {
        const { sql, mapRow } = this.render()
        const rows = await this.state.databaseHandle.query(sql)
        return rows.map(mapRow)
    }

    asTable = <Alias extends string>(
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
        : never => {
        const cols = Object.entries(this.selection)
        if (cols.some(c => !(COLUMN_DEFINITION in c))) {
            throw Error("Can only convert flat selection of columns to a table")
        }
        const newCols: [string, ColumnDefinition<SubqueryOrigin, SqlType, Alias, string, undefined>][] = cols.map(
            ([name, def]) => {
                const oldDef = def as ColumnDefinition<Origin, SqlType>
                const newDef = {
                    [COLUMN_DEFINITION]: true,
                    tableOrigin: { type: "subquery", render: this.render },
                    tableAlias: alias,
                    columnName: name,
                    sqlType: oldDef.sqlType,
                    references: undefined,
                } as const
                return [name, newDef]
            },
        )
        return Object.fromEntries(newCols) as any
    }
}

class SelectedStageImpl<QueriedTables extends TableDefinitions, Selection>
    implements OrderStage<QueriedTables, Selection> {
    constructor(private backend: StageBackend<QueriedTables, Selection>) {}

    map = <R>(f: undefined | null | false | ((stage: this) => R)) => (typeof f === "function" ? f(this) : this)

    private attach = <Q extends TableDefinitions, S, T extends unknown[]>(f: (...args: T) => StageBackend<Q, S>) => (
        ...args: T
    ) => new SelectedStageImpl(f(...args))

    orderBy = this.attach(this.backend.orderBy)
    thenBy = this.attach(this.backend.thenBy)
    limit = this.attach(this.backend.limit)
    offset = this.attach(this.backend.offset)
    fetch = this.backend.fetch
    asTable = this.backend.asTable
    render = this.backend.render
}

class MultiTableStageImpl<QueriedTables extends TableDefinitions> implements OnStage<QueriedTables> {
    constructor(private backend: StageBackend<QueriedTables, QueriedTables>) {}

    map = <R>(f: undefined | null | false | ((stage: this) => R)) => (typeof f === "function" ? f(this) : this)

    private attach = <T extends unknown[]>(f: (...args: T) => StageBackend<QueriedTables, QueriedTables>) => (
        ...args: T
    ) => new MultiTableStageImpl<QueriedTables>(f(...args))

    innerJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) => {
        return new MultiTableStageImpl(this.backend.innerJoin<OtherTable>(otherTable))
    }
    on = this.attach(this.backend.on)
    where = this.attach(this.backend.where)
    and = this.attach(this.backend.and)
    or = this.attach(this.backend.or)

    select = <Selection extends SelectionFrom<QueriedTables>>(selection: Selection) => {
        return new SelectedStageImpl(this.backend.select(selection))
    }

    orderBy = this.attach(this.backend.orderBy)
    thenBy = this.attach(this.backend.thenBy)
    limit = this.attach(this.backend.limit)
    offset = this.attach(this.backend.offset)

    fetch = this.backend.fetch
    asTable = this.backend.asTable
    render = this.backend.render
}

class SingleTableStageImpl<QueriedTable extends TableDefinition> implements InsertStage<QueriedTable> {
    constructor(private backend: StageBackend<QueriedTablesFromSingle<QueriedTable>, QueriedTable>) {}

    map = <R>(f: undefined | null | false | ((stage: this) => R)) => (typeof f === "function" ? f(this) : this)

    private attach = <T extends unknown[]>(
        f: (...args: T) => StageBackend<QueriedTablesFromSingle<QueriedTable>, QueriedTable>,
    ) => (...args: T) => new SingleTableStageImpl<QueriedTable>(f(...args))

    where = this.attach(this.backend.where)
    and = this.attach(this.backend.and)
    or = this.attach(this.backend.or)

    innerJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) => {
        return new MultiTableStageImpl(this.backend.innerJoin<OtherTable>(otherTable))
    }
    orderBy = this.attach(this.backend.orderBy)
    thenBy = this.attach(this.backend.thenBy)
    limit: any = this.attach(this.backend.limit)
    offset: any = this.attach(this.backend.offset)

    select = <Selection extends SelectionFrom<QueriedTablesFromSingle<QueriedTable>>>(selection: Selection) => {
        return new SelectedStageImpl(this.backend.select(selection))
    }
    fetch = this.backend.fetch
    asTable = this.backend.asTable
    render = this.backend.render

    insert = (row: RowTypeFrom<QueriedTable>) => {
        const {
            state: { primaryTable },
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
            return this.executeStage(`INSERT INTO ${tableNameSql} DEFAULT VALUES`)
        } else {
            const columnsSql = columnNames.map(renderIdentifier).join(",")
            const valuesSql = Object.values(row).map(renderLiteral).join(",")
            return this.executeStage(`INSERT INTO ${tableNameSql} (${columnsSql}) VALUES (${valuesSql})`)
        }
    }

    update = (row: Partial<RowTypeFrom<QueriedTable>>) => {
        const {
            state: { filter },
            primaryTableName,
        } = this.backend

        const tableNameSql = primaryTableName.map(renderIdentifier).join(",")
        const updateSql = Object.entries(row)
            .map(([key, value]) => `${renderIdentifier(key)} = ${renderLiteral(value)}`)
            .join(",")
        const sql = `UPDATE ${tableNameSql} SET ${updateSql}${whereSql(filter)}`
        return this.executeStage(sql)
    }

    delete = () => {
        const {
            state: { filter },
            primaryTableName,
        } = this.backend
        const tableNameSql = primaryTableName.map(renderIdentifier).join(",")
        const sql = `DELETE FROM ${tableNameSql}${whereSql(filter)}`
        return this.executeStage(sql)
    }

    private executeStage(sql: string) {
        // TODO: render lazily
        return {
            render: () => ({ sql }),
            execute: () => this.backend.state.databaseHandle.execute(sql),
        }
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
                op: "=",
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

function columnDefinitionSql(columnDef: ColumnDefinition<Origin, unknown>, alias?: string) {
    //  is render identifier correct for aliases?
    const aliasSql = alias === undefined ? "" : ` AS ${renderIdentifier(alias)}`
    return `${renderIdentifier(columnDef.tableAlias)}.${renderIdentifier(columnDef.columnName)}${aliasSql}`
}

function joinSql(joinInfo: JoinInfo): string {
    const { joinedTablesByAlias, joinFiltersByAlias } = joinInfo
    const tables = Object.values(joinedTablesByAlias)
    if (tables.length === 0) {
        return ""
    }
    let sql = ""
    for (const [joinType, tableDefinition] of tables) {
        const { tableAlias, tableOrigin } = tableDetails(tableDefinition)

        if (tableOrigin.type !== "table") {
            throw Error(`table ${tableAlias} is not a real table`)
        }

        sql += ` ${joinTypeSql(joinType)} ${realTableSql(tableOrigin)}`
        const filter: Filter | undefined = joinFiltersByAlias[tableAlias]
        if (filter !== undefined) {
            sql += ` ON (${filterSql(filter)})`
        }
    }
    return sql
}

function orderLimitOffsetSql(olo?: OrderLimitOffset) {
    if (olo === undefined) return ""
    const { orderBy, limit, offset } = olo
    let sql = ""
    if (orderBy.length > 0) {
        const orderBySql = orderBy
            .map(entry =>
                typeof entry.column === "string"
                    ? renderIdentifier(entry.column) + orderDirectionSql(entry.direction)
                    : columnDefinitionSql(entry.column) + orderDirectionSql(entry.direction),
            )
            .join(", ")
        sql += ` ORDER BY ${orderBySql}`
    }
    if (limit !== undefined) {
        sql += ` LIMIT ${renderLiteral(limit)}`
    }
    if (offset !== undefined) {
        sql += ` OFFSET ${renderLiteral(offset)}`
    }
    return sql
}

function orderDirectionSql(direction: undefined | "ASC" | "DESC") {
    switch (direction) {
        case undefined:
            return ""
        case "ASC":
            return " ASC"
        case "DESC":
            return " DESC"
        default:
            unreachable()
    }
}

function whereSql(filter: Filter | undefined) {
    if (filter === undefined) {
        return ""
    } else {
        return `WHERE ${filterSql(filter)}`
    }
}

function filterSql(filter: Filter) {
    let sql = filterComponentSql(filter.first)
    for (const [connective, filterComponent] of filter.rest) {
        sql += connective === "and" ? " AND " : " OR "
        sql += `(${filterComponentSql(filterComponent)})`
    }
    return sql
}

function filterComponentSql(filterComponent: boolean | Filter | FilterElement): string {
    if (typeof filterComponent === "boolean") {
        return renderLiteral(filterComponent)
    } else if (filterComponent.type === "element") {
        const opSql = filterOperatorSql(filterComponent.op)
        const leftSql = expressionSql(filterComponent.left)
        const rightSql = expressionSql(filterComponent.right)
        return `${leftSql} ${opSql} ${rightSql}`
    } else {
        return `(${filterSql(filterComponent)})`
    }
}

function filterOperatorSql(op: SqlOperator): string {
    return op === "=" ? "=" : "<>"
}

function expressionSql(expr: Expression): string {
    switch (expr.type) {
        case "column":
            return columnDefinitionSql(expr.definition)
        case "literal":
            return renderLiteral(expr.literal)
    }
}

function joinTypeSql(joinType: JoinType): string {
    switch (joinType) {
        case "inner":
            return "INNER JOIN"
        default:
            unreachable()
    }
}

function realTableSql(tableOrigin: RealTableOrigin) {
    return tableOrigin.name.map(renderIdentifier).join(".")
}

function tableDetails(definition: TableDefinition): { tableAlias: string; tableOrigin: Origin } {
    const cols = Object.values(definition)
    if (cols.length === 0) {
        throw Error("table has zero columns")
    }
    return cols[0]
}

function unreachable(): never {
    throw Error("unreachable")
}
