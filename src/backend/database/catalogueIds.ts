import Crypto from "crypto"
import * as uuid from "uuid"
import { unixNow } from "../../util/time"
import { Timestamp } from "../../util/types"

export type CatalogueId = Uint8Array
export type CatalogueIdString = string

const VERSION_INDEX = 6
const VARIANT_INDEX = 8
export const CATALOGUE_ID_LENGTH_BYTES = 16

// random generation inspired by https://github.com/aarondcohen/id128/blob/814797e191095141da1bc553fc4ec92baaf0146a/src/common/random-bytes.js
const RANDOM_BUFFER_SIZE = 4096 /* typical page size */ - 96 /* Empty buffer overhead */

/** Provides secure random bytes for the Catalogue ID generator */
class RandomProvider {
    private randomBuffer = new Uint8Array(RANDOM_BUFFER_SIZE)
    private randomBufferOffset = RANDOM_BUFFER_SIZE

    get10RandomBytes = () => {
        if (this.randomBufferOffset + 10 >= RANDOM_BUFFER_SIZE) {
            this.randomBufferOffset = 0
            Crypto.randomFillSync(this.randomBuffer)
        }
        const randomBytes = this.randomBuffer.slice(this.randomBufferOffset, this.randomBufferOffset + 10)
        this.randomBufferOffset += 10
        return randomBytes
    }
}

const UINT32_RADIX = 2 ** 32
const UINT8_MAX = 0b1111_1111

export class CatalogueIdGenerator {
    // TODO: probably simpler to make this just a module with a generate function
    constructor(
        private now: () => Timestamp = unixNow,
        private get10RandomBytes: () => Uint8Array = new RandomProvider().get10RandomBytes,
    ) {}

    /**
     * Generates a 16 byte catalogue ID.
     *
     * Catalogue IDs are valid v4 format UUIDs, but the first 48 bits are set to the millisecond timestamp
     * since unix epoch.
     *
     * Furthermore, when generating an ID for the same millisecond timestamp as last time, the generator can
     * be configured to increment the random part rather than generating new random bits.
     *
     * This construction means that typically IDs will be lexicographically ordered by creation time, which is
     * good for database storage as primary keys with a b-tree index, much better than purely random IDs.
     *
     * Also, it saves storing the creation timestamp separately.
     *
     * Format: mmmmmmmm-mmmm-vrrr-arrr-rrrrrrrrrrrr
     *
     *     Where:
     *     m=millisecond timestamp (48 bits);
     *     v=UUID version (4 bits, 0b0100)
     *     r=random (12 bits)
     *     a=UUID variant 1 indicator (2 bits 0b10) then 2 bits random
     *     r=remaining random (60 bits)
     *
     * Ignoring bits fixed by UUIDv4, we have 48 timestamp bits and 74 random bits
     */
    generate(): CatalogueId {
        const bytes = new Uint8Array(CATALOGUE_ID_LENGTH_BYTES)

        populateTimestamp(bytes, this.now())

        bytes.set(this.get10RandomBytes(), 6)

        // set UUID version 4, code 0b0100, in top 4 bits
        bytes[VERSION_INDEX] &= 0b0000_1111
        bytes[VERSION_INDEX] |= 0b0100_0000

        // set UUID variant 1, code 0b10, in top 2 bits
        bytes[VARIANT_INDEX] &= 0b0011_1111
        bytes[VARIANT_INDEX] |= 0b1000_0000

        return bytes
    }
}

export function parseCatalogueId(id: CatalogueIdString): CatalogueId {
    try {
        return uuid.parse(id) as Uint8Array // the typescript types just say it's an ArrayLike but we know better
    } catch (error: unknown) {
        throw new Error(`Failed to parse catalogue ID ${id}: ${error}`)
    }
}

export function stringifyCatalogueId(id: CatalogueId): CatalogueIdString {
    return uuid.stringify(id)
}

export function extractTimestamp(id: CatalogueId): Timestamp {
    let result = 0
    for (let i = 0; i < 6; i++) {
        result = result * 256 + id[i]!
    }
    return result as Timestamp
}

function populateTimestamp(bytes: Uint8Array, timestamp: Timestamp) {
    const timeLow = timestamp % UINT32_RADIX
    const timeHigh = (timestamp - timeLow) / UINT32_RADIX
    let i = 0
    bytes[i++] = (timeHigh >>> 8) & UINT8_MAX
    bytes[i++] = (timeHigh >>> 0) & UINT8_MAX
    bytes[i++] = (timeLow >>> 24) & UINT8_MAX
    bytes[i++] = (timeLow >>> 16) & UINT8_MAX
    bytes[i++] = (timeLow >>> 8) & UINT8_MAX
    bytes[i++] = (timeLow >>> 0) & UINT8_MAX
}
