import { table } from "./definitions"
import { queryBuilder, noDatabaseHandle } from "./impl"
import { string, number, intAsJsString, boolean } from "./types"
import { MySqlDialect } from "./dialect"

const exampleTable = table("foo", {
    col1: string,
    col2: number,
})

const exampleTable2 = table("bar", {
    col3: string,
})

const mappyTable = table("baz", {
    id: intAsJsString,
    enabled: boolean,
})

const qb = queryBuilder(noDatabaseHandle(new MySqlDialect()))

interface Renderable {
    render: () => { sql: string }
}

function expectExtraSql<T extends Renderable>(
    initial: T,
    delta: (initial: T) => Renderable,
    expectedExtraSql: string,
) {
    const a = initial.render().sql
    const b = delta(initial).render().sql
    expect(b.indexOf(a)).toBe(0)
    expect(b.slice(a.length)).toBe(expectedExtraSql)
}

test("truncate", () => {
    expect(qb(exampleTable).truncate().render().sql).toBe("TRUNCATE TABLE `foo`")
})

test("query table with default selection", () => {
    expect(qb(exampleTable).render().sql).toBe(
        "SELECT `foo`.`col1` AS `col1`, `foo`.`col2` AS `col2` FROM `foo` AS `foo`",
    )
})

test("join", () => {
    expect(
        qb(exampleTable).innerJoin(exampleTable2).on(exampleTable.col1, "=", exampleTable2.col3).render().sql,
    ).toBe(
        "SELECT `foo`.`col1`, `foo`.`col2`, `bar`.`col3` FROM `foo` AS `foo` INNER JOIN `bar` AS `bar` ON (`foo`.`col1` = `bar`.`col3`)",
    )
})

describe("where clause", () => {
    test("renders IN correctly", () => {
        // remark: we allow the wrong type to appear after IN (but not every option can be of the wrong type)
        // seems harmless enough
        expect(qb(exampleTable).where(exampleTable.col1, "IN", ["foo", "bar", true]).render().sql).toBe(
            "SELECT `foo`.`col1` AS `col1`, `foo`.`col2` AS `col2` FROM `foo` AS `foo` WHERE `foo`.`col1` IN ('foo', 'bar', true)",
        )
    })
})

describe("insert", () => {
    test("insert renders correctly", () => {
        expect(qb(exampleTable).insert({ col1: "a", col2: 42 }).render().sql).toBe(
            "INSERT INTO `foo` (`col1`, `col2`) VALUES ('a', 42)",
        )
    })
})

describe("update", () => {
    test("update renders correctly", () => {
        expect(qb(exampleTable).update({ col1: "a", col2: 42 }).render().sql).toBe(
            "UPDATE `foo` SET `col1` = 'a', `col2` = 42",
        )
    })
    test("update renders correctly with where clause", () => {
        expect(qb(exampleTable).where({ col1: "old" }).update({ col1: "a", col2: 42 }).render().sql).toBe(
            "UPDATE `foo` SET `col1` = 'a', `col2` = 42 WHERE `foo`.`col1` = 'old'",
        )
    })
    test("update applies type mapping", () => {
        expect(qb(mappyTable).update({ id: "42" }).render().sql).toBe("UPDATE `baz` SET `id` = 42")
    })
    // TODO: update should not use aliases?
})

describe("select", () => {
    test("select one column", () => {
        const r = qb(exampleTable).select(exampleTable.col1).render()
        expect(r.sql).toBe("SELECT `foo`.`col1` FROM `foo` AS `foo`")
        expect(r.mapRow(["a"])).toBe("a")
    })

    test("select multiple columns", () => {
        const r = qb(exampleTable).select({ col1: exampleTable.col1, col2: exampleTable.col2 }).render()
        expect(r.sql).toBe("SELECT `foo`.`col1` AS `col1`, `foo`.`col2` AS `col2` FROM `foo` AS `foo`")
        expect(r.mapRow(["a", 42])).toStrictEqual({ col1: "a", col2: 42 })
    })

    test("rename columns", () => {
        const r = qb(exampleTable).select({ foo: exampleTable.col1, bar: exampleTable.col2 }).render()
        expect(r.sql).toBe("SELECT `foo`.`col1` AS `foo`, `foo`.`col2` AS `bar` FROM `foo` AS `foo`")
        expect(r.mapRow(["a", 42])).toStrictEqual({ foo: "a", bar: 42 })
    })

    test("nested table in select", () => {
        const r = qb(exampleTable).select({ foo: exampleTable.col1, exampleTable }).render()
        expect(r.sql).toBe("SELECT `foo`.`col1` AS `foo`, `foo`.`col1`, `foo`.`col2` FROM `foo` AS `foo`")
        expect(r.mapRow(["a", "b", 42])).toStrictEqual({ foo: "a", exampleTable: { col1: "b", col2: 42 } })
    })

    test("deep nesting", () => {
        const r = qb(exampleTable)
            .select({ c1: exampleTable.col1, foo: { bar: { baz: exampleTable } } })
            .render()
        expect(r.sql).toBe("SELECT `foo`.`col1` AS `c1`, `foo`.`col1`, `foo`.`col2` FROM `foo` AS `foo`")
        expect(r.mapRow(["a", "b", 42])).toStrictEqual({
            c1: "a",
            foo: { bar: { baz: { col1: "b", col2: 42 } } },
        })
    })
})

test("order by", () => {
    expectExtraSql(qb(exampleTable), q => q.orderBy("col2"), " ORDER BY `col2`")
    expectExtraSql(qb(exampleTable), q => q.orderBy(exampleTable.col1), " ORDER BY `foo`.`col1`")
    expectExtraSql(qb(exampleTable), q => q.orderBy("col2", "ASC"), " ORDER BY `col2` ASC")
    expectExtraSql(qb(exampleTable), q => q.orderBy("col2", "DESC"), " ORDER BY `col2` DESC")
})

test("then by", () => {
    expectExtraSql(qb(exampleTable).orderBy("col2"), q => q.thenBy("col1"), ", `col1`")
    expectExtraSql(qb(exampleTable).orderBy("col2"), q => q.thenBy(exampleTable.col1), ", `foo`.`col1`")
    expectExtraSql(
        qb(exampleTable).orderBy("col2", "ASC"),
        q => q.thenBy(exampleTable.col1, "DESC"),
        ", `foo`.`col1` DESC",
    )
})

test("limit", () => {
    expectExtraSql(qb(exampleTable), q => q.limit(42), " LIMIT 42")
})

test("offset", () => {
    expectExtraSql(qb(exampleTable), q => q.offset(42), " OFFSET 42")
})

describe("fetching", () => {
    test("fetchOne throws on 0 rows", async () => {
        const queryBuilderReturningNoRows = queryBuilder({
            dialect: new MySqlDialect(),
            query: () => Promise.resolve([]),
        } as any)
        await expect(queryBuilderReturningNoRows(exampleTable).fetchOne()).rejects.toThrow(
            "Expected 1 row, got 0",
        )
    })
    test("fetchOne throws on >1 row", () => {
        const queryBuilderReturningMultipleRows = queryBuilder({
            dialect: new MySqlDialect(),
            query: () => Promise.resolve([{}, {}, {}]),
        } as any)
        expect(queryBuilderReturningMultipleRows(exampleTable).fetchOne()).rejects.toThrow(
            "Expected 1 row, got 3",
        )
    })
})

describe("row mapping", () => {
    test("maps types", () => {
        expect(qb(mappyTable).render().mapRow([42, 1])).toStrictEqual({ id: "42", enabled: true })
    })
})
