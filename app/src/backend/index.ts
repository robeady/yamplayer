import express from "express"
import { AddressInfo } from "net"
import { serve } from "./rpc/server"
import { DeezerApiClient } from "../services/deezer"
import { LibraryStore } from "./library"
import { MariaDB } from "./database"
import { Explorer } from "./explorer"
import { Resolver } from "../services/plugins"
import { promises as fs } from "fs"

type Server = import("http").Server

interface LibrarySeedFile {
    externalTrackIds: string[]
}

async function loadLibrarySeed(): Promise<LibrarySeedFile> {
    const seedFileName = "librarySeed.json"
    try {
        const seedFile = await fs.readFile(seedFileName)
        return JSON.parse(seedFile.toString())
    } catch (e) {
        if (e.code === "ENOENT") {
            console.log(`no ${seedFileName} file present`)
            return { externalTrackIds: [] }
        }
        throw e
    }
}

async function main(): Promise<AddressInfo> {
    const app = express()
    app.use(express.json())

    const db = await MariaDB.connect()
    const deezerApiClient = await DeezerApiClient.create({ cacheDirectory: "cache/deezer" })
    const library = new LibraryStore(db)
    const librarySeed = await loadLibrarySeed()
    const explorer = await Explorer.seeded(library, deezerApiClient, new Resolver(), librarySeed.externalTrackIds)

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
    .catch(e => console.error(e))
