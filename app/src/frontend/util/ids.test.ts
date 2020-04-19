import { idSequence } from "./ids"

test("generates expected sequence", () => {
    const nextId = idSequence()
    expect(nextId()).toBe("0")
    expect(nextId()).toBe("1")
    expect(nextId()).toBe("2")
    expect(nextId()).toBe("3")
})

test("generates expected sequence with multiple digits", () => {
    const nextId = idSequence({ alphabet: "01" })
    expect(nextId()).toBe("0")
    expect(nextId()).toBe("1")
    expect(nextId()).toBe("00")
    expect(nextId()).toBe("01")
    expect(nextId()).toBe("10")
    expect(nextId()).toBe("11")
    expect(nextId()).toBe("000")
    expect(nextId()).toBe("001")
    expect(nextId()).toBe("010")
    expect(nextId()).toBe("011")
})
