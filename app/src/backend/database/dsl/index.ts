import { Dict } from "../../../util/types"
import { TABLE_NAME, TABLE_ALIAS } from "./symbols"
import {
    TableFilteredStage,
    OrderedStage,
    TableStage,
    JoinedStage,
    OrderStage,
    FetchStage,
    OffsetStage,
    SelectStage,
} from "./stages"
import { SelectionFrom, ColumnIn } from "./selectionTypes"
import { TableDefinition, table, ColumnDefinition, AliasedColumn } from "./definitions"

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

type Condition = { isCondition: true } // TODO

type Selection =
    | { type: "table"; alias: string; columnNames: string[] }
    | { type: "tableColumn"; tableAlias: string; columnName: string }
    | { type: "aliasedColumn"; tableAlias: string; columnName: string; alias: string }
    | { type: "expression"; rawSql: string } // TODO do the sql properly

class SelectedQuery<Tables, SelectedTables, SelectedAliases>
    implements OrderStage<Tables, SelectedTables, SelectedAliases> {
    constructor(
        protected startingTable: TableDefinition<any, any, any, any>,
        protected joinedTables: [TableDefinition<any, any, any, any>, Condition][],
        private selections: Selection[],
    ) {}
}

class JoinedQuery<Tables, References> extends SelectedQuery<Tables, Tables, {}>
    implements JoinedStage<Tables, References> {
    constructor(
        startingTable: TableDefinition<any, any, any, any>,
        joinedTables: [TableDefinition<any, any, any, any>, Condition][],
    ) {
        super(startingTable, joinedTables)
    }

    select<SelectionArray extends SelectionFrom<Tables>[]>(
        ...selection: SelectionArray
    ): ReturnType<SelectStage<Tables>["select"]> {
        // each selection can be one of:
        // 1. a table definition in Tables
        // 2. a column definition from a table in Tables
        // 3. an aliased column definition from a table in Tables
        // 4. an aliased sql expression
        const selections: Selection[] = selection.map(
            (s: TableDefinition<any, any, any, any> | ColumnDefinition<any, any> | AliasedColumn<any, any>, i) => {
                if (TABLE_ALIAS in s && TABLE_NAME in s) {
                    const t = s as TableDefinition<any, any, any, any>
                    return {
                        type: "table",
                        alias: t[TABLE_ALIAS],
                        columnNames: Object.keys(t).filter(k => typeof k === "string"),
                    }
                } else if ("columnName" in s) {
                    const c = s as ColumnDefinition<any, any> & { alias?: string }
                    if (c.alias !== undefined) {
                        return {
                            type: "aliasedColumn",
                            tableAlias: c.tableAlias,
                            columnName: c.columnName,
                            alias: c.alias,
                        }
                    } else {
                        return { type: "tableColumn", tableAlias: c.tableAlias, columnName: c.columnName }
                    }
                } else {
                    // TODO: arbitary expressions
                    throw Error(`DSL misues: could not interpret selection at index ${i} => ${JSON.stringify(s)}`)
                }
            },
        )
        return new SelectedQuery(this.startingTable, this.joinedTables, selections) as OrderStage<any, any, any>
    }
}

class SingleTableQuery<TableName extends string, Table, References = unknown>
    implements TableStage<TableName, Row, References>, TableFilteredStage<TableName, Row>, OrderedStage<Table> {
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

function literal(value: unknown) {
    // TODO: handle strings
    return value
}
