import { promises as fs } from "fs"
import * as path from "path"

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

    async getItem(key: string): Promise<object | null> {
        try {
            const filePath = this.getFilePath(key)
            const contents = await fs.readFile(filePath)
            console.log(`cache hit for ${key}`)
            return JSON.parse(contents.toString())
        } catch (e) {
            console.error(e)
            if (e.code === "ENOENT") {
                return null
            }
            throw e
        }
    }

    async setItem<T>(key: string, value: T): Promise<T> {
        try {
            const filePath = this.getFilePath(key)
            const data = JSON.stringify(value)
            await fs.writeFile(filePath, data)
            console.log(`cached ${key}`)
            return value
        } catch (e) {
            console.error(`failed to cache ${key}`)
            console.error(e)
            throw e
        }
    }

    async removeItem(key: string): Promise<void> {
        const filePath = this.getFilePath(key)
        await fs.unlink(filePath)
    }

    async clear(): Promise<void> {
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
        const sanitised =
            key.replace(/_/g, "__").replace(/=/g, "==").replace(/\//g, "_").replace(/:/g, "=") + ".json"
        return path.join(this.cacheDirectory, sanitised)
    }
}
