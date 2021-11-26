import globalAxios from "axios"
import express from "express"
import { DeezerApiClient } from "../services/deezer"
import { Resolver } from "../services/plugins/resolver"
import { parseNumber } from "../util"
import { listen, ListeningExpress } from "../util/express"
import { MariaDB } from "./database/handle"
import { Explorer } from "./explorer"
import { LibraryStore } from "./library"
import { serve } from "./rpc/server"

async function main(): Promise<ListeningExpress> {
    const app = express()
    app.use(express.json({ limit: "10mb" }))

    const db = MariaDB.connect({
        user: process.env.YP_DB_USER!,
        password: process.env.YP_DB_PASSWORD!,
        database: process.env.YP_DB_NAME,
    })
    const deezerApiClient = await DeezerApiClient.create({ cacheDirectory: "cache/deezer" })
    const library = await LibraryStore.setup(db)
    const explorer = new Explorer(library, deezerApiClient, new Resolver())

    app.use("/api/library", serve(library))
    app.use("/api/explorer", serve(explorer))

    app.get("/api/proxy", async (req, res) => {
        const url = req.query.url as string
        try {
            const response = await globalAxios.get(url, { responseType: "stream" })
            response.data.pipe(res)
        } catch (error: any) {
            // on async handlers express won't do any error handling by default,
            // let's take care of it ourselves.
            console.error(error)
            res.status(500).json(`${error?.name || "Error"}: ${error?.message || JSON.stringify(error)}`)
        }
    })

    return listen(app, parseNumber(process.env.YP_PORT) ?? 0, "127.0.0.1")
}

main()
    .then(({ address, port }) => {
        console.log(`backend listening on ${address}:${port}`)
    })
    .catch(error => console.error(error))
