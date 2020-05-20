import { ColumnIn } from "./selectionTypes"
import { MULTIPLE_TABLES } from "./symbols"

export type Match<Tables> = {}
// export type Match<Tables> = Tables extends { [MULTIPLE_TABLES]: true }
//     ? {
//           // multiple tables: object must have a key for each table to match on
//           [TableAlias in keyof Tables & string]?: Partial<Tables[TableAlias]>
//       } // single table: object must not be nested inside the table name
//     : Partial<Tables[keyof Tables & string]>

type SqlValueExpr<Row> = { type: "column"; col: Column<Row, unknown> } | { type: "literal"; value: unknown }

type BinaryOp = "==" | ">"

type FilterClause<Row> = { introducedBy: "" | "and" | "or"; expression: FilterClause<Row>[] | FilterExpr<Row> }

type FilterExpr<Row> = { left: SqlValueExpr<Row>; op: BinaryOp; right: SqlValueExpr<Row> }

function filterSingleTable<Row>(
    matchOrExpression: ColumnIn<Row, unknown> | Match<Row>,
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

function filterSingleTableMatch<Table>(match: Match<Table>): FilterClause<Table>[] {
    // TODO: check for no unexpected properties so this type assertion is actually valid
    const entries = Object.entries(match) as [keyof Table, unknown][]
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
