import { promises as fs } from "fs"
import path from "path"
import { moduleLogger } from "../../backend/logging"
import { Dict } from "../../util/types"

const logger = moduleLogger(module)

// implements https://github.com/RasCarlito/axios-cache-adapter/blob/master/src/memory.js
/**
 * A filesystem cache of responses to axios requests.
 *
 * Assumes that the specified directory contains no other files or subdirectories.
 */
export class FilesystemAxiosCache {
    private constructor(private cacheDirectory: string) {}

    static async open(cacheDirectory: string): Promise<FilesystemAxiosCache> {
        await fs.mkdir(cacheDirectory, { recursive: true })
        return new FilesystemAxiosCache(cacheDirectory)
    }

    async getItem(key: string): Promise<Dict | null> {
        try {
            const filePath = this.getFilePath(key)
            const contents = await fs.readFile(filePath)
            logger.debug(`cache hit for ${key}`)
            return JSON.parse(contents.toString())
        } catch (error: unknown) {
            logger.debug(`cache miss for ${key}`)
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return null
            }
            throw error
        }
    }

    async setItem<T>(key: string, value: T): Promise<T> {
        try {
            const filePath = this.getFilePath(key)
            const data = JSON.stringify(value)
            await fs.writeFile(filePath, data)
            logger.debug(`cached ${key}`)
            return value
        } catch (error: unknown) {
            logger.error(`failed to cache ${key}:`, error)
            throw error
        }
    }

    async removeItem(key: string): Promise<void> {
        const filePath = this.getFilePath(key)
        await fs.unlink(filePath)
    }

    async clear(): Promise<void> {
        logger.info("clearing cache")
        await fs.rmdir(this.cacheDirectory, { recursive: true })
        await fs.mkdir(this.cacheDirectory)
    }

    async length(): Promise<number> {
        const fileNames = await fs.readdir(this.cacheDirectory)
        return fileNames.length
    }

    async iterate<T>(fn: (value: string, key: string) => T): Promise<T[]> {
        const fileNames = await fs.readdir(this.cacheDirectory)
        const resultPromises = fileNames.map(async fileName => {
            const filePath = path.join(this.cacheDirectory, fileName)
            const fileBuffer = await fs.readFile(filePath)
            const json = JSON.parse(fileBuffer.toString())
            return fn(json, filePath)
        })
        return Promise.all(resultPromises)
    }

    private getFilePath(key: string): string {
        // bijective sanitization function to avoid erroneous collisions
        // TODO: may need expansion as I hit more URLs
        const disallowedCharsInWindowsFileNames = [
            /\//gu,
            /:/gu,
            /\?/gu,
            /"/gu,
            /</gu,
            />/gu,
            /\\/gu,
            /\|/gu,
            /\*/gu,
        ]
        const replacement = "_"
        const replacementPairings = [replacement, ...disallowedCharsInWindowsFileNames].map(
            (original, i) => [original, replacement.repeat(i + 2)] as const,
        )
        let sanitised = key
        for (const [original, replacement] of replacementPairings) {
            sanitised = sanitised.replace(original, replacement)
        }
        return path.join(this.cacheDirectory, sanitised + ".json")
    }
}
