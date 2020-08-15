import { MySqlDialect } from "./dialect"

const dialect = new MySqlDialect()

test("escape literal produces correct SQL", () => {
    expect(dialect.escape("foo")).toBe("'foo'")
    expect(dialect.escape(42)).toBe("42")
    expect(dialect.escape(3.14)).toBe("3.14")
    expect(dialect.escape(null)).toBe("NULL")
    expect(dialect.escape(true)).toBe("true")
    expect(dialect.escape(false)).toBe("false")
    expect(dialect.escape(["foo", 42, true])).toBe("('foo', 42, true)")
})

test("escape literals escapes quotes", () => {
    expect(dialect.escape("don't")).toBe("'don\\'t'")
    expect(dialect.escape("don't won't")).toBe("'don\\'t won\\'t'")
})

test("escape identifier wraps in backticks", () => {
    expect(dialect.escapeId("foo")).toBe("`foo`")
    expect(dialect.escapeId("foo1")).toBe("`foo1`")
    expect(dialect.escapeId("foo_bar")).toBe("`foo_bar`")
    expect(dialect.escapeId("a b c")).toBe("`a b c`")
    expect(dialect.escapeId("221b")).toBe("`221b`")
})

test("escape backquotes", () => {
    expect(dialect.escapeId("I`ve got backtick")).toBe("`I``ve got backtick`")
})
