import * as uuid from "uuid"
import { Timestamp } from "../../util/types"
import { CatalogueIdGenerator, stringifyCatalogueId } from "./catalogueIds"

test("it works", () => {
    expect(() => new CatalogueIdGenerator().generate()).not.toThrow()
})

test("it's fast", () => {
    const generator = new CatalogueIdGenerator()
    const start = process.hrtime()
    for (let i = 0; i < 100_000; i++) {
        generator.generate()
    }
    // expected to complete in <60ms
    expect(process.hrtime(start)).toBeLessThan(0.06)
})

test("ids generated in same millisecond use increment", () => {
    const generator = new CatalogueIdGenerator(
        () => 0 as Timestamp,
        () => new Uint8Array(10),
    )
    expect(generator.generate()).toStrictEqual(
        new Uint8Array([0, 0, 0, 0, 0, 0, 64, 0, 128, 0, 0, 0, 0, 0, 0, 0]),
    )
    expect(generator.generate()).toStrictEqual(
        new Uint8Array([0, 0, 0, 0, 0, 0, 64, 0, 128, 0, 0, 0, 0, 0, 0, 1]),
    )
    expect(generator.generate()).toStrictEqual(
        new Uint8Array([0, 0, 0, 0, 0, 0, 64, 0, 128, 0, 0, 0, 0, 0, 0, 2]),
    )
})

test("valid v4 UUIDs", () => {
    const randomId = stringifyCatalogueId(new CatalogueIdGenerator().generate())
    expect(uuid.validate(randomId)).toBe(true)
    expect(uuid.version(randomId)).toBe(4)
    const zeroSeededId = stringifyCatalogueId(
        new CatalogueIdGenerator(
            () => 0 as Timestamp,
            () => new Uint8Array(10),
        ).generate(),
    )
    expect(uuid.validate(zeroSeededId)).toBe(true)
    expect(uuid.version(zeroSeededId)).toBe(4)
})

test("re-randomise on increment exhastion", () => {
    const generator = new CatalogueIdGenerator(
        () => 0 as Timestamp,
        () => new Uint8Array(10).fill(255),
    )
    const expected = new Uint8Array([
        0,
        0,
        0,
        0,
        0,
        0,
        255 & 0b0100_1111,
        255,
        255 & 0b1011_1111,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
    ])
    expect(generator.generate()).toStrictEqual(expected)
    // this random part cannot be incremented, so we expect the generator to call random again
    // since our random source is fixed this means the same ID should repeat
    expect(generator.generate()).toStrictEqual(expected)
})

test("embeds correct timestamps", () => {
    const generator = new CatalogueIdGenerator(
        () => 0xaa_bb_cc_dd_ee_ff as Timestamp,
        () => new Uint8Array(10).fill(255),
    )
    expect(generator.generate().slice(0, 6)).toStrictEqual(
        new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]),
    )
})
