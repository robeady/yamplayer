import { table } from "./definitions"
import { queryBuilder, noDatabaseHandle, renderIdentifier, renderLiteral } from "./impl"
import { string, number, intAsJsString } from "./types"

const exampleTable = table("foo", {
    col1: string,
    col2: number,
})

const exampleTable2 = table("bar", {
    col3: string,
})

const exampleTableWithMapping = table("baz", {
    id: intAsJsString,
})

const qb = queryBuilder(noDatabaseHandle)

interface Renderable {
    render: () => { sql: string }
}

function expectExtraSql<T extends Renderable>(initial: T, delta: (initial: T) => Renderable, expectedExtraSql: string) {
    const a = initial.render().sql
    const b = delta(initial).render().sql
    expect(b.indexOf(a)).toBe(0)
    expect(b.slice(a.length)).toBe(expectedExtraSql)
}

describe("rendering literals and identifiers", () => {
    test("render literal produces correct SQL", () => {
        expect(renderLiteral("foo")).toBe("'foo'")
        expect(renderLiteral(42)).toBe("42")
        expect(renderLiteral(3.14)).toBe("3.14")
        expect(renderLiteral(BigInt("999999"))).toBe("999999")
        expect(renderLiteral(null)).toBe("NULL")
        expect(renderLiteral(true)).toBe("TRUE")
        expect(renderLiteral(false)).toBe("FALSE")
    })

    test("render literals escapes quotes", () => {
        expect(renderLiteral("don't")).toBe("'don''t'")
        expect(renderLiteral("don't won't")).toBe("'don''t won''t'")
    })

    test("render identifer wraps in backticks", () => {
        expect(renderIdentifier("foo")).toBe("`foo`")
        expect(renderIdentifier("foo1")).toBe("`foo1`")
        expect(renderIdentifier("foo_bar")).toBe("`foo_bar`")
        expect(renderIdentifier("a b c")).toBe("`a b c`")
        expect(renderIdentifier("221b")).toBe("`221b`")
    })

    test("throw on identifier containing backquote", () => {
        expect(() => renderIdentifier("I`ve got backtick")).toThrow()
    })
})

test("query table with default selection", () => {
    expect(qb(exampleTable).render().sql).toBe(
        "SELECT `foo`.`col1` AS `col1`, `foo`.`col2` AS `col2` FROM `foo` AS `foo`",
    )
})

test("join", () => {
    expect(qb(exampleTable).innerJoin(exampleTable2).on(exampleTable.col1, "=", exampleTable2.col3).render().sql).toBe(
        "SELECT `foo`.`col1`, `foo`.`col2`, `bar`.`col3` FROM `foo` AS `foo` INNER JOIN `bar` AS `bar` ON (`foo`.`col1` = `bar`.`col3`)",
    )
})

describe("insert", () => {
    test("insert renders corectly", () => {
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
        expect(qb(exampleTableWithMapping).update({ id: "42" }).render().sql).toBe("UPDATE `baz` SET `id` = 42")
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
        expect(r.mapRow(["a", "b"])).toStrictEqual({ col1: "a", col2: "b" })
    })

    test("rename columns", () => {
        const r = qb(exampleTable).select({ foo: exampleTable.col1, bar: exampleTable.col2 }).render()
        expect(r.sql).toBe("SELECT `foo`.`col1` AS `foo`, `foo`.`col2` AS `bar` FROM `foo` AS `foo`")
        expect(r.mapRow(["a", "b"])).toStrictEqual({ foo: "a", bar: "b" })
    })

    test("nested table in select", () => {
        const r = qb(exampleTable).select({ foo: exampleTable.col1, exampleTable }).render()
        expect(r.sql).toBe("SELECT `foo`.`col1` AS `foo`, `foo`.`col1`, `foo`.`col2` FROM `foo` AS `foo`")
        expect(r.mapRow(["a", "b", "c"])).toStrictEqual({ foo: "a", exampleTable: { col1: "b", col2: "c" } })
    })

    test("deep nesting", () => {
        const r = qb(exampleTable)
            .select({ c1: exampleTable.col1, foo: { bar: { baz: exampleTable } } })
            .render()
        expect(r.sql).toBe("SELECT `foo`.`col1` AS `c1`, `foo`.`col1`, `foo`.`col2` FROM `foo` AS `foo`")
        expect(r.mapRow(["a", "b", "c"])).toStrictEqual({ c1: "a", foo: { bar: { baz: { col1: "b", col2: "c" } } } })
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
