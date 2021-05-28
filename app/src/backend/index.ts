import express from "express"
import { DeezerApiClient } from "../services/deezer"
import { Resolver } from "../services/plugins"
import { listen, ListeningExpress } from "../util/express"
import { MariaDB } from "./database/handle"
import { Explorer } from "./explorer"
import { LibraryStore } from "./library"
import { serve } from "./rpc/server"

async function main(): Promise<ListeningExpress> {
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

    return listen(app, 8280, "127.0.0.1")
}

main()
    .then(({ address, port }) => {
        console.log(`backend listening on ${address}:${port}`)
    })
    .catch(error => console.error(error))
