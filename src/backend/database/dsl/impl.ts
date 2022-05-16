import { mapValues, size } from "lodash"
import { Dict } from "../../../util/types"
import {
    ColumnDefinition,
    Origin,
    RealTableOrigin,
    SubqueryOrigin,
    TableDefinition,
    TableDefinitions,
} from "./definitions"
import { SqlDialect } from "./dialect"
import { DslMisuseError, TodoError } from "./errors"
import {
    AliasIn,
    ColumnIn,
    ColumnsFrom,
    ExecResult,
    InsertStage,
    InsertTypeFor,
    OnStage,
    OrderStage,
    QueriedTablesFromSingle,
    RowTypeFrom,
    SelectionFrom,
} from "./stages"
import { COLUMN_DEFINITION, RAW_SQL } from "./symbols"

export type QueryBuilder = <T extends TableDefinition>(table: T) => InsertStage<T>

export function queryBuilder(databaseHandle: DatabaseHandle): QueryBuilder {
    return <T extends TableDefinition>(table: T) =>
        new SingleTableStageImpl<T>(
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

const errorNoDatabase = () => {
    throw new Error("no database")
}

export function noDatabaseHandle(dialect: SqlDialect): DatabaseHandle {
    return {
        dialect,
        execute: errorNoDatabase,
        query: errorNoDatabase,
        inTransaction: errorNoDatabase,
    }
}

export interface DatabaseConnectionHandle {
    execute: (sql: string, values?: unknown[]) => Promise<ExecResult>
    query: (sql: string, values?: unknown[]) => Promise<unknown[][]>
}

export interface DatabaseHandle extends DatabaseConnectionHandle {
    dialect: SqlDialect
    inTransaction: <T>(f: (connection: DatabaseConnectionHandle) => Promise<T>) => Promise<T>
}

interface OrderLimitOffset {
    limit?: number
    offset?: number
    orderBy: {
        column: string | ColumnDefinition // TODO should there be type args here?
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

const sqlOperators = ["=", "<>", "IN", "IS", "IS NOT"] as const
type SqlOperator = typeof sqlOperators[number]

type Expression =
    | { type: "literal"; literal: unknown }
    | { type: "column"; definition: ColumnDefinition }
    | { type: "tuple"; expressions: Expression[] }

type JoinType = "inner" | "left" | "right"

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
            throw new Error("not a real table")
        }
        this.primaryTableAlias = primaryTableDetails.tableAlias
        this.primaryTableName = primaryTableDetails.tableOrigin.name
        this.selection =
            selection ??
            (((size(state.joinedTablesByAlias) === 0
                ? state.primaryTable
                : {
                      [this.primaryTableAlias]: state.primaryTable,
                      ...mapValues(state.joinedTablesByAlias, v => v[1]),
                  }) as unknown) as Selection)
    }

    renderer = new Renderer(this.state.databaseHandle.dialect)

    where = (...args: unknown[]) =>
        this.withWhereFilter(f => {
            if (f === undefined) {
                return parseFilterArgs(this.selection, args)
            } else {
                throw new DslMisuseError("where called multiple times")
            }
        })

    on = (...args: unknown[]) =>
        this.withJoinFilter(f => {
            if (f === undefined) {
                return parseFilterArgs(this.selection, args)
            } else {
                throw new DslMisuseError("on called multiple times")
            }
        })

    and = (...args: unknown[]) => this.andOr("and", args)

    or = (...args: unknown[]) => this.andOr("or", args)

    private andOr = (connective: "and" | "or", args: unknown[]) =>
        this.withFilter(f => {
            if (f === undefined) {
                throw new DslMisuseError(`${connective} called before where/join`)
            } else {
                return { ...f, rest: [...f.rest, [connective, parseFilterArgs(this.selection, args)]] }
            }
        })

    private withFilter = (f: (oldFilter?: Filter) => Filter) =>
        this.state.currentlyJoiningAgainstAlias === undefined
            ? this.withWhereFilter(f)
            : this.withJoinFilter(f)

    private withWhereFilter = (f: (oldFilter?: Filter) => Filter) =>
        new StageBackend<QueriedTables, Selection>(
            { ...this.state, filter: f(this.state.filter) },
            this.selection,
        )

    private withJoinFilter = (f: (oldFilter?: Filter) => Filter) => {
        if (this.state.currentlyJoiningAgainstAlias === undefined) {
            throw new DslMisuseError("on/and/or clause used prior to join")
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

    innerJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) => this.join(otherTable, "inner")

    leftJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) => this.join(otherTable, "left")

    rightJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) => this.join(otherTable, "right")

    private join = <OtherTable extends TableDefinition>(otherTable: OtherTable, joinType: JoinType) => {
        const columns = Object.values(otherTable)
        if (columns.length === 0) {
            throw new Error("joined table has zero columns")
        }
        const { tableAlias } = columns[0]!
        if (tableAlias === this.primaryTableAlias) {
            throw new Error("joined table has same alias as initial table")
        }
        if (tableAlias in this.state.joinedTablesByAlias) {
            throw new Error("joined table has same alias as another joined table")
        }
        return new StageBackend<any, any>(
            {
                ...this.state,
                joinedTablesByAlias: {
                    ...this.state.joinedTablesByAlias,
                    [tableAlias]: [joinType, otherTable],
                },
                currentlyJoiningAgainstAlias: tableAlias,
                // clear some params explicitly (although they shouldn't be set) so the types work out
                orderLimitOffset: { orderBy: [] },
            },
            null,
        )
    }

    select = <Selection extends SelectionFrom<QueriedTables>>(selection: Selection) =>
        new StageBackend<QueriedTables, Selection>(
            { ...this.state, orderLimitOffset: { orderBy: [] } },
            selection,
        )

    orderBy = (column: ColumnIn<QueriedTables> | AliasIn<Selection>, direction?: "ASC" | "DESC") =>
        this.thenBy(column, direction)

    thenBy = (column: ColumnIn<QueriedTables> | AliasIn<Selection>, direction?: "ASC" | "DESC") =>
        this.withOrderLimitOffset(olo => ({
            ...olo,
            orderBy: [...olo.orderBy, { column, direction }],
        }))

    limit = (limit: number) => this.withOrderLimitOffset(olo => ({ ...olo, limit }))
    offset = (offset: number) => this.withOrderLimitOffset(olo => ({ ...olo, offset }))

    private withOrderLimitOffset = (f: (oldOrderLimitOffset: OrderLimitOffset) => OrderLimitOffset) =>
        new StageBackend<QueriedTables, Selection>(
            { ...this.state, orderLimitOffset: f(this.state.orderLimitOffset) },
            this.selection,
        )

    render = () => {
        const { dialect } = this.state.databaseHandle

        const selectionsSql = traverseSelection(this.selection, (keyPath, col) =>
            this.renderer.columnDefinitionSql(col, keyPath.length === 1 ? keyPath[0] : undefined),
        ).join(", ")

        const selectionDestinations = traverseSelection(this.selection, keyPath => keyPath)

        const columnsInPrimaryTable = Object.values(this.state.primaryTable)
        if (columnsInPrimaryTable.length === 0) throw new Error("Primary table has no columns")
        const { tableOrigin, tableAlias } = columnsInPrimaryTable[0]!
        const tableOriginSql =
            tableOrigin.type === "table"
                ? this.renderer.realTableSql(tableOrigin)
                : // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions
                  `(${tableOrigin.render().sql})`
        const fromSql = `${tableOriginSql} AS ${dialect.escapeIdentifier(tableAlias)}`

        const sql = `SELECT ${selectionsSql} FROM ${fromSql}${this.renderer.joinSql(
            this.state,
        )}${this.renderer.whereSql(this.state.filter)}${this.renderer.orderLimitOffsetSql(
            this.state.orderLimitOffset,
        )}`

        const mapRow = (row: unknown[]) => {
            let rowObject: any = {}
            // eslint-disable-next-line unicorn/no-for-loop
            for (let i = 0; i < row.length; i++) {
                rowObject = populateAtPath(
                    rowObject,
                    selectionDestinations[i]!,
                    dialect.convertSqlValueToJs(row[i]),
                )
            }
            return rowObject
        }

        return { sql, mapRow }
    }

    fetchOne = async (): Promise<RowTypeFrom<Selection>> => {
        const { sql, mapRow } = this.render()
        const rows = await this.state.databaseHandle.query(sql)
        if (rows.length !== 1) throw new Error(`Expected 1 row, got ${rows.length}`)
        return mapRow(rows[0]!)
    }

    fetch = async (): Promise<RowTypeFrom<Selection>[]> => {
        const { sql, mapRow } = this.render()
        const rows = await this.state.databaseHandle.query(sql)
        return rows.map(r => mapRow(r))
    }

    asTable = <Alias extends string>(
        alias: Alias,
    ): Selection extends Record<string, ColumnDefinition>
        ? TableDefinition<
              SubqueryOrigin,
              Alias,
              ColumnsFrom<
                  Alias,
                  {
                      [ColumnName in keyof Selection]: Selection[ColumnName]["type"]
                  }
              >
          >
        : never => {
        const cols = Object.entries(this.selection)
        if (cols.some(c => !(COLUMN_DEFINITION in c))) {
            throw new Error("Can only convert flat selection of columns to a table")
        }
        const newCols: [
            string,
            ColumnDefinition<SubqueryOrigin, unknown, false, Alias, string, undefined>,
        ][] = cols.map(([name, def]) => {
            const oldDef = def as ColumnDefinition
            const newDef = {
                [COLUMN_DEFINITION]: true,
                tableOrigin: { type: "subquery", render: this.render },
                tableAlias: alias,
                columnName: name,
                type: oldDef.type,
                hasDefault: false,
                references: undefined,
            } as const
            return [name, newDef]
        })
        return Object.fromEntries(newCols) as any
    }
}

class SelectedStageImpl<QueriedTables extends TableDefinitions, Selection>
    implements OrderStage<QueriedTables, Selection> {
    constructor(private backend: StageBackend<QueriedTables, Selection>) {}

    map = <R>(f: (stage: this) => R) => f(this)

    private attach = <Q extends TableDefinitions, S, T extends unknown[]>(
        f: (...args: T) => StageBackend<Q, S>,
    ) => (...args: T) => new SelectedStageImpl(f(...args))

    orderBy = this.attach(this.backend.orderBy)
    thenBy = this.attach(this.backend.thenBy)
    limit = this.attach(this.backend.limit)
    offset = this.attach(this.backend.offset)
    fetch = this.backend.fetch
    fetchOne = this.backend.fetchOne
    asTable = this.backend.asTable
    render = this.backend.render
}

class MultiTableStageImpl<QueriedTables extends TableDefinitions> implements OnStage<QueriedTables> {
    constructor(private backend: StageBackend<QueriedTables, QueriedTables>) {}

    map = <R>(f: (stage: this) => R) => f(this)

    private attach = <T extends unknown[]>(f: (...args: T) => StageBackend<QueriedTables, QueriedTables>) => (
        ...args: T
    ) => new MultiTableStageImpl<QueriedTables>(f(...args))

    innerJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) =>
        new MultiTableStageImpl(this.backend.innerJoin<OtherTable>(otherTable)) as any

    leftJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) =>
        new MultiTableStageImpl(this.backend.leftJoin<OtherTable>(otherTable)) as any

    rightJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) =>
        new MultiTableStageImpl(this.backend.rightJoin<OtherTable>(otherTable)) as any

    on = this.attach(this.backend.on)
    where = this.attach(this.backend.where)
    and = this.attach(this.backend.and)
    or = this.attach(this.backend.or)

    select = <Selection extends SelectionFrom<QueriedTables>>(selection: Selection) =>
        new SelectedStageImpl(this.backend.select(selection))

    orderBy = this.attach(this.backend.orderBy)
    thenBy = this.attach(this.backend.thenBy)
    limit = this.attach(this.backend.limit)
    offset = this.attach(this.backend.offset)

    fetch = this.backend.fetch
    fetchOne = this.backend.fetchOne
    asTable = this.backend.asTable
    render = this.backend.render
}

class SingleTableStageImpl<QueriedTable extends TableDefinition> implements InsertStage<QueriedTable> {
    constructor(private backend: StageBackend<QueriedTablesFromSingle<QueriedTable>, QueriedTable>) {}

    renderer = new Renderer(this.backend.state.databaseHandle.dialect)

    map = <R>(f: (stage: this) => R) => f(this)

    private attach = <T extends unknown[]>(
        f: (...args: T) => StageBackend<QueriedTablesFromSingle<QueriedTable>, QueriedTable>,
    ) => (...args: T) => new SingleTableStageImpl<QueriedTable>(f(...args))

    where = this.attach(this.backend.where)
    and = this.attach(this.backend.and)
    or = this.attach(this.backend.or)

    innerJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) =>
        new MultiTableStageImpl(this.backend.innerJoin<OtherTable>(otherTable)) as any

    leftJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) =>
        new MultiTableStageImpl(this.backend.leftJoin<OtherTable>(otherTable)) as any

    rightJoin = <OtherTable extends TableDefinition>(otherTable: OtherTable) =>
        new MultiTableStageImpl(this.backend.rightJoin<OtherTable>(otherTable)) as any

    orderBy = this.attach(this.backend.orderBy)
    thenBy = this.attach(this.backend.thenBy)
    limit: any = this.attach(this.backend.limit)
    offset: any = this.attach(this.backend.offset)

    select = <Selection extends SelectionFrom<QueriedTablesFromSingle<QueriedTable>>>(selection: Selection) =>
        new SelectedStageImpl(this.backend.select(selection))
    fetch = this.backend.fetch
    fetchOne = this.backend.fetchOne
    asTable = this.backend.asTable
    render = this.backend.render

    truncate = () => {
        const { dialect } = this.backend.state.databaseHandle
        const tableNameSql = this.backend.primaryTableName
            .map(part => dialect.escapeIdentifier(part))
            .join(".")
        return this.executeStage(`TRUNCATE TABLE ${tableNameSql}`)
    }

    insert = (rows: InsertTypeFor<QueriedTable> | InsertTypeFor<QueriedTable>[]) => {
        const {
            state: {
                primaryTable,
                databaseHandle: { dialect },
            },
            primaryTableName,
        } = this.backend

        if (rows.length === 0) {
            throw new Error("no rows to insert")
        }

        const tableNameSql = primaryTableName.map(part => dialect.escapeIdentifier(part)).join(".")

        if (!Array.isArray(rows)) {
            rows = [rows]
        }

        const columnNames = new Set<string>()
        for (const row of rows) {
            for (const columnName of Object.keys(row)) {
                columnNames.add(columnName)
            }
        }

        for (const columnName of columnNames) {
            if (!(columnName in primaryTable)) {
                throw new Error(`column ${columnName} not found in table ${primaryTableName.join(".")}`)
            }
        }

        const columnsSql = [...columnNames].map(name => dialect.escapeIdentifier(name)).join(", ")

        const valuesSql = rows
            .map(row => {
                const sqlValues = []
                for (const columnName of columnNames) {
                    const value = row[columnName]
                    const sqlValue = value === undefined ? "DEFAULT" : dialect.escapeJsValueToSql(value)
                    sqlValues.push(sqlValue)
                }
                return `(${sqlValues.join(", ")})`
            })
            .join(", ")

        return this.executeStage(`INSERT INTO ${tableNameSql} (${columnsSql}) VALUES ${valuesSql}`)
    }

    update = (row: Partial<RowTypeFrom<QueriedTable>>) => {
        const {
            state: {
                filter,
                databaseHandle: { dialect },
            },
            primaryTableName,
        } = this.backend
        const tableNameSql = primaryTableName.map(part => dialect.escapeIdentifier(part)).join(".")
        const updateSql = Object.entries(row)
            .map(
                ([columnName, value]) =>
                    `${dialect.escapeIdentifier(columnName)} = ${dialect.escapeJsValueToSql(value)}`,
            )
            .join(", ")
        const sql = `UPDATE ${tableNameSql} SET ${updateSql}${this.renderer.whereSql(filter)}`
        return this.executeStage(sql)
    }

    delete = () => {
        const {
            state: {
                filter,
                databaseHandle: { dialect },
            },
            primaryTableName,
        } = this.backend
        const tableNameSql = primaryTableName.map(part => dialect.escapeIdentifier(part)).join(".")
        const sql = `DELETE FROM ${tableNameSql}${this.renderer.whereSql(filter)}`
        return this.executeStage(sql)
    }

    private executeStage(sql: string) {
        // TODO: render lazily
        return {
            render: () => ({ sql }),
            execute: async () => this.backend.state.databaseHandle.execute(sql),
        }
    }
}

function parseFilterArgs(defaultSelection: any, args: unknown[]): Filter {
    if (args.length === 1) {
        if (typeof args[0] === "function") {
            throw new TodoError("where builder function")
        } else if (typeof args[0] === "object" && args[0] !== null) {
            return parseMatcher(defaultSelection, args[0] as Dict)
        } else {
            throw new TypeError("unexpected single argument of type " + typeof args[0])
        }
    } else if (args.length === 3) {
        return { type: "filter", first: parseWhereClause(args[0], args[1], args[2]), rest: [] }
    } else {
        throw new DslMisuseError("invalid where clause")
    }
}

function parseWhereClause(left: unknown, operator: unknown, right: unknown): FilterElement {
    if (!sqlOperators.includes(operator as any)) {
        throw new Error(`unsupported operator ${JSON.stringify(operator)}`)
    }
    return {
        type: "element",
        left: parseExpression(left),
        op: operator as SqlOperator,
        right: parseExpression(right),
    }
}

function parseExpression(expr: unknown): Expression {
    return Array.isArray(expr)
        ? { type: "tuple", expressions: expr.map(parseExpression) }
        : typeof expr === "object" && expr !== null && COLUMN_DEFINITION in expr
        ? { type: "column", definition: expr as ColumnDefinition }
        : { type: "literal", literal: expr }
}

function parseMatcher(defaultSelection: any, matcher: Dict): Filter {
    const elements = parseMatcherIntoFilterElements(defaultSelection, matcher)
    const first = elements.shift() ?? true
    return { type: "filter", first, rest: elements.map(e => ["and", e]) }
}

function parseMatcherIntoFilterElements(defaultSelection: any, matcher: Dict): FilterElement[] {
    return COLUMN_DEFINITION in defaultSelection
        ? [
              {
                  type: "element",
                  left: { type: "column", definition: defaultSelection },
                  op: "=",
                  right: { type: "literal", literal: matcher },
              },
          ]
        : Object.entries(matcher).flatMap(([key, subMatcher]) => {
              if (key in defaultSelection) {
                  return parseMatcherIntoFilterElements(defaultSelection[key], subMatcher as Dict)
              } else {
                  throw new Error(`Key ${key} in matcher not found in selected tables`)
              }
          })
}

function populateAtPath(object: any, path: string[], value: unknown, pathStartIndex = 0) {
    const pathLength = path.length - pathStartIndex
    if (pathLength === 0) {
        return value
    } else if (pathLength === 1) {
        object[path[pathStartIndex]!] = value
        return object
    } else {
        let subObject: any
        if (path[pathStartIndex]! in object) {
            subObject = object[path[pathStartIndex]!]
        } else {
            subObject = {}
            object[path[pathStartIndex]!] = subObject
        }
        populateAtPath(subObject, path, value, pathStartIndex + 1)
        return object
    }
}

function traverseSelection<T>(
    selection: any,
    func: (keyPath: string[], columnDefinition: ColumnDefinition) => T,
    keyPathPrefix: string[] = [],
): T[] {
    if (COLUMN_DEFINITION in selection) {
        return [func(keyPathPrefix, selection as ColumnDefinition)]
    } else if (RAW_SQL in selection) {
        // TODO handle raw sql
        throw new Error("raw sql not supported yet")
    } else {
        return Object.entries(selection).flatMap(([key, s]) =>
            traverseSelection(s, func, [...keyPathPrefix, key]),
        )
    }
}

class Renderer {
    constructor(private dialect: SqlDialect) {}

    escapeId(identifier: string) {
        return this.dialect.escapeIdentifier(identifier)
    }

    escape(value: unknown) {
        return this.dialect.escapeJsValueToSql(value)
    }

    columnDefinitionSql(columnDef: ColumnDefinition, alias?: string) {
        //  is render identifier correct for aliases?
        const aliasSql = alias === undefined ? "" : ` AS ${this.escapeId(alias)}`
        return `${this.escapeId(columnDef.tableAlias)}.${this.escapeId(columnDef.columnName)}${aliasSql}`
    }

    joinSql(joinInfo: JoinInfo): string {
        const { joinedTablesByAlias, joinFiltersByAlias } = joinInfo
        const tables = Object.values(joinedTablesByAlias)
        if (tables.length === 0) {
            return ""
        }
        let sql = ""
        for (const [joinType, tableDefinition] of tables) {
            const { tableAlias, tableOrigin } = tableDetails(tableDefinition)

            if (tableOrigin.type !== "table") {
                throw new Error(`table ${tableAlias} is not a real table`)
            }

            sql += ` ${joinTypeSql(joinType)} ${this.realTableSql(tableOrigin)} AS ${this.escapeId(
                tableAlias,
            )}`
            const filter: Filter | undefined = joinFiltersByAlias[tableAlias]
            if (filter !== undefined) {
                sql += ` ON (${this.filterSql(filter)})`
            }
        }
        return sql
    }

    orderLimitOffsetSql(olo?: OrderLimitOffset) {
        if (olo === undefined) return ""
        const { orderBy, limit, offset } = olo
        let sql = ""
        if (orderBy.length > 0) {
            const orderBySql = orderBy
                .map(entry =>
                    typeof entry.column === "string"
                        ? this.escapeId(entry.column) + orderDirectionSql(entry.direction)
                        : this.columnDefinitionSql(entry.column) + orderDirectionSql(entry.direction),
                )
                .join(", ")
            sql += ` ORDER BY ${orderBySql}`
        }
        if (limit !== undefined) {
            sql += ` LIMIT ${this.escape(limit)}`
        }
        if (offset !== undefined) {
            sql += ` OFFSET ${this.escape(offset)}`
        }
        return sql
    }

    whereSql(filter: Filter | undefined) {
        return filter === undefined ? "" : ` WHERE ${this.filterSql(filter)}`
    }

    filterSql(filter: Filter) {
        let sql = this.filterComponentSql(filter.first)
        for (const [connective, filterComponent] of filter.rest) {
            sql += connective === "and" ? " AND " : " OR "
            sql += `(${this.filterComponentSql(filterComponent)})`
        }
        return sql
    }

    filterComponentSql(filterComponent: boolean | Filter | FilterElement): string {
        if (typeof filterComponent === "boolean") {
            return this.escape(filterComponent)
        } else if (filterComponent.type === "element") {
            const opSql = filterOperatorSql(filterComponent.op)
            const leftSql = this.expressionSql(filterComponent.left)
            const rightSql = this.expressionSql(filterComponent.right)
            return `${leftSql} ${opSql} ${rightSql}`
        } else {
            return `(${this.filterSql(filterComponent)})`
        }
    }

    expressionSql(expr: Expression): string {
        switch (expr.type) {
            case "column":
                return this.columnDefinitionSql(expr.definition)
            case "literal":
                // TODO: get appropriate column definition
                return this.escape(expr.literal)
            case "tuple":
                return `(${expr.expressions.map(e => this.expressionSql(e)).join(", ")})`
        }
    }

    realTableSql(tableOrigin: RealTableOrigin) {
        return tableOrigin.name.map(part => this.escapeId(part)).join(".")
    }
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
            unreachable(direction)
    }
}

function filterOperatorSql(op: SqlOperator): string {
    switch (op) {
        case "=":
            return "="
        case "<>":
            return "<>"
        case "IN":
            return "IN"
        case "IS":
            return "IS"
        case "IS NOT":
            return "IS NOT"
        default:
            unreachable(op)
    }
}

function joinTypeSql(joinType: JoinType): string {
    switch (joinType) {
        case "inner":
            return "INNER JOIN"
        case "left":
            return "LEFT JOIN"
        case "right":
            return "RIGHT JOIN"
        default:
            unreachable(joinType)
    }
}

function tableDetails(definition: TableDefinition): { tableAlias: string; tableOrigin: Origin } {
    const cols = Object.values(definition)
    if (cols.length === 0) {
        throw new Error("table has zero columns")
    }
    return cols[0]!
}

function unreachable(_: never): never {
    throw new Error("unreachable")
}
