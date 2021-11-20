import { MySqlDialect } from "./dialect"

const dialect = new MySqlDialect()

test("escape literal produces correct SQL", () => {
    expect(dialect.escapeJsValueToSql("foo")).toBe("'foo'")
    expect(dialect.escapeJsValueToSql(42)).toBe("42")
    expect(dialect.escapeJsValueToSql(3.14)).toBe("3.14")
    expect(dialect.escapeJsValueToSql(null)).toBe("NULL")
    expect(dialect.escapeJsValueToSql(true)).toBe("true")
    expect(dialect.escapeJsValueToSql(false)).toBe("false")
    expect(dialect.escapeJsValueToSql(Buffer.from([1, 2, 3]))).toBe("X'010203'")
    expect(dialect.escapeJsValueToSql(new Uint8Array([1, 2, 3]))).toBe("X'010203'")
    expect(dialect.escapeJsValueToSql(["foo", 42, true])).toBe("('foo', 42, true)")
})

test("escape literals escapes quotes", () => {
    expect(dialect.escapeJsValueToSql("don't")).toBe("'don\\'t'")
    expect(dialect.escapeJsValueToSql("don't won't")).toBe("'don\\'t won\\'t'")
})

test("escape identifier wraps in backticks", () => {
    expect(dialect.escapeIdentifier("foo")).toBe("`foo`")
    expect(dialect.escapeIdentifier("foo1")).toBe("`foo1`")
    expect(dialect.escapeIdentifier("foo_bar")).toBe("`foo_bar`")
    expect(dialect.escapeIdentifier("a b c")).toBe("`a b c`")
    expect(dialect.escapeIdentifier("221b")).toBe("`221b`")
})

test("escape backquotes", () => {
    expect(dialect.escapeIdentifier("I`ve got backtick")).toBe("`I``ve got backtick`")
})
