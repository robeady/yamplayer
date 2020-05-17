import { Dict } from "../../../util/types"
import { TABLE_NAME } from "./symbols"
import { Match } from "./stages"

type KeysExtending<Row, T> = {
    [K in keyof Row]: Row[K] extends T ? K : never
}[keyof Row]

interface DatabaseHandle {
    execute(sql: string): Promise<ExecResult>
}

interface QueryData<Row> {
    selections?: string[]
    limit?: number
    offset?: number
    orderBy: {
        column: Column<Row, unknown>
        direction?: "asc" | "desc"
    }[]
}

class SingleTableQuery<TableName extends string, Row, References = unknown>
    implements FilteredTable<TableName, Row>, Ordered<Row>, Tablee<TableName, Row, References> {
    constructor(
        private databaseHandle: DatabaseHandle,
        private table: TableDefinition<TableName, Dict<ColumnType<unknown>>>,
        private filter?: WhereClauseOld,
        private query?: QueryData<Row>,
    ) {}

    insert(row: Row): Promise<ExecResult> {
        const columnNames = Object.keys(row)
        if (columnNames.length === 0) {
            return this.databaseHandle.execute(`INSERT INTO ${this.table[TABLE_NAME]} DEFAULT VALUES`)
        } else {
            const columns = columnNames.join(",")
            const values = Object.values(row).join(",")
            return this.databaseHandle.execute(`INSERT INTO ${this.table[TABLE_NAME]} (${columns}) VALUES (${values})`)
        }
    }

    join<OtherTableName extends keyof References, OtherRow extends References[OtherTableName], OtherReferences>(
        otherTable: Tablee<OtherTableName, OtherRow, OtherReferences>,
    ): Joined<Record<TableName, Row> & Record<OtherTableName, OtherRow>, References & OtherReferences> {
        throw new Error("Method not implemented.")
    }

    update(row: Partial<Row>): Promise<ExecResult> {
        if (this.query !== undefined) {
            throw Error("DSL misuse: called update after building a query")
        } else {
            const updates = Object.entries(row)
                .map(([key, value]) => `${key} = ${literal(value)}`)
                .join(",")
            return this.databaseHandle.execute(
                `UPDATE ${this.table[TABLE_NAME]} SET ${updates}${sqlWhere(this.filter)}`,
            )
        }
    }

    delete(): Promise<ExecResult> {
        if (this.query === undefined) {
            return this.databaseHandle.execute(`DELETE FROM ${this.table[TABLE_NAME]}${sqlWhere(this.filter)}`)
        } else {
            throw Error("DSL misuse: called update after building a query")
        }
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

    select(...columns: Column<Row, number>[]): Orderable<Row> {
        if (this.query?.selections !== undefined) {
            throw Error("DSL misuse: called select more than once")
        }
        if (columns.length === 0) {
            throw Error("DSL misuse: nothing selected")
        }
        const selections = columns.map((col, index) => {
            if (typeof col === "string") {
                // col is the name of a table column or an alias, so leave it as is
                // TODO: backquotes?
                return col
            } else if (Array.isArray(col) && typeof col[0] === "string" && typeof col[1] === "string") {
                // col is of the form [table name, column name]
                // TODO: escape identifiers, backquotes?
                return `${col[0]}.${col[1]}`
            } else {
                throw Error(`DSL misuse: invalid select at index ${index} = ${JSON.stringify(col)}`)
            }
        })
        return this.modifyQuery(q => ({ ...q, selections }))
    }

    orderBy(column: Column<Row, unknown>, direction?: "asc" | "desc"): Ordered<Row> {
        if (this.query === undefined || this.query.orderBy.length === 0) {
            return this.thenBy(column, direction)
        } else {
            throw Error("DSL misuse: called orderBy more than once")
        }
    }
    thenBy(column: Column<Row, unknown>, direction?: "asc" | "desc"): Ordered<Row> {
        return this.modifyQuery(q => ({ ...q, orderBy: [...q.orderBy, { column, direction }] }))
    }
    limit(limit: number): OffsetStage<Row> {
        return this.modifyQuery(q => ({ ...q, limit }))
    }
    offset(offset: number): Fetchable<Row> {
        return this.modifyQuery(q => ({ ...q, offset }))
    }

    private modifyQuery(f: (oldQuery: QueryData<Row>) => QueryData<Row>): SingleTableQuery<TableName, Row, References> {
        return new SingleTableQuery(this.databaseHandle, this.table, this.filter, f(this.query ?? { orderBy: [] }))
    }

    fetch(): Row[] {
        throw new Error("Method not implemented.")
    }
}

type SqlValueExpr<Row> = { type: "column"; col: Column<Row, unknown> } | { type: "literal"; value: unknown }

type BinaryOp = "==" | ">"

type FilterClause<Row> = { introducedBy: "" | "and" | "or"; expression: FilterClause<Row>[] | FilterExpr<Row> }

type FilterExpr<Row> = { left: SqlValueExpr<Row>; op: BinaryOp; right: SqlValueExpr<Row> }

function literal(value: unknown) {
    // TODO: handle strings
    return value
}

function filterSingleTable<Row>(
    matchOrExpression: Column<Row, unknown> | Match<Row>,
    operator?: BinaryOp,
    // TODO refine this type, watch out for undefined
    expression?: unknown,
): FilterClause<Row>[] | FilterExpr<Row> {
    if (operator === undefined && expression === undefined) {
        return filterSingleTableMatch<Row>(matchOrExpression as Match<Row>)
    } else {
        return filterABC(matchOrExpression as Column<Row, unknown>, operator!, expression)
    }
}

function filterSingleTableMatch<Row>(match: Predicate<Row>): FilterClause<Row>[] {
    // TODO: check for no unexpected properties so this type assertion is actually valid
    const entries = Object.entries(match) as [keyof Row, unknown][]
    if (entries.length === 0) {
        return []
    }
    const [firstColName, firstValue] = entries.shift()!
    const result: FilterClause<Row>[] = [
        {
            introducedBy: "",
            expression: {
                left: { type: "column", col: firstColName as KeysExtending<Row, unknown> },
                op: "==",
                right: { type: "literal", value: firstValue },
            },
        },
    ]
    for (const [column, value] of entries) {
        result.push({
            introducedBy: "and",
            expression: {
                left: { type: "column", col: column as KeysExtending<Row, unknown> },
                op: "==",
                right: { type: "literal", value },
            },
        })
    }
    return result
}

function filterABC<Row>(left: Column<Row, unknown>, op: BinaryOp, right: unknown): FilterExpr<Row> {
    return { left: { type: "column", col: left }, op, right: { type: "literal", value: right } }
}
