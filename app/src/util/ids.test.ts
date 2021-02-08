import { IdSequence } from "./ids"

test("generates expected sequence", () => {
    const seq = new IdSequence()
    expect(seq.next()).toBe("0")
    expect(seq.next()).toBe("1")
    expect(seq.next()).toBe("2")
    expect(seq.next()).toBe("3")
})

test("generates expected sequence with multiple digits", () => {
    const seq = new IdSequence("01")
    expect(seq.next()).toBe("0")
    expect(seq.next()).toBe("1")
    expect(seq.next()).toBe("00")
    expect(seq.next()).toBe("01")
    expect(seq.next()).toBe("10")
    expect(seq.next()).toBe("11")
    expect(seq.next()).toBe("000")
    expect(seq.next()).toBe("001")
    expect(seq.next()).toBe("010")
    expect(seq.next()).toBe("011")
})
