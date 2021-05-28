import express from "express"
import { promises as fs } from "fs"
import { AddressInfo } from "net"
import { DeezerApiClient } from "../services/deezer"
import { Resolver } from "../services/plugins"
import { MariaDB } from "./database/handle"
import { Explorer } from "./explorer"
import { LibraryStore } from "./library"
import { serve } from "./rpc/server"

type Server = import("http").Server

interface LibrarySeedFile {
    externalTrackIds: string[]
}

async function _loadLibrarySeed(): Promise<LibrarySeedFile> {
    const seedFileName = "librarySeed.json"
    try {
        const seedFile = await fs.readFile(seedFileName)
        return JSON.parse(seedFile.toString())
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            console.log(`no ${seedFileName} file present`)
            return { externalTrackIds: [] }
        }
        throw error
    }
}

async function main(): Promise<AddressInfo> {
    const app = express()
    app.use(express.json({ limit: "10mb" }))

    const db = MariaDB.connect()
    const deezerApiClient = await DeezerApiClient.create({ cacheDirectory: "cache/deezer" })
    const library = await LibraryStore.setup(db)
    // const librarySeed = await loadLibrarySeed()
    // const explorer = await Explorer.seeded(
    //     library,
    //     deezerApiClient,
    //     new Resolver(),
    //     librarySeed.externalTrackIds,
    // )
    const explorer = new Explorer(library, deezerApiClient, new Resolver())

    app.use("/library", serve(library))
    app.use("/explorer", serve(explorer))

    return new Promise((resolve, reject) => {
        const server: Server = app.listen(8280, "127.0.0.1", err => {
            if (err) {
                return reject(err)
            }
            return resolve(server.address() as AddressInfo)
        })
    })
}

main()
    .then(({ address, port }) => {
        console.log(`backend listening on ${address}:${port}`)
    })
    .catch(error => console.error(error))
