import globalAxios from "axios"
import express from "express"
import { DeezerApiClient } from "../services/deezer"
import { Resolver } from "../services/plugins/resolver"
import { parseNumber } from "../util"
import { listen, ListeningExpress } from "../util/express"
import { MariaDB } from "./database/handle"
import { Explorer } from "./explorer"
import { LibraryStore } from "./library"
import { moduleLogger } from "./logging"
import { serve } from "./rpc/server"

if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    require("source-map-support").install()
}

const logger = moduleLogger(module)

async function main(): Promise<ListeningExpress> {
    const app = express()
    app.use(express.json({ limit: "10mb" }))

    logger.info("app starting")

    const db = MariaDB.connect({
        user: process.env.YP_DB_USER!,
        password: process.env.YP_DB_PASSWORD!,
        database: process.env.YP_DB_NAME,
    })

    const deezerApiClient = await DeezerApiClient.create({ cacheDirectory: "cache/deezer" })
    const library = await LibraryStore.setup(db)
    const explorer = new Explorer(library, deezerApiClient, new Resolver())

    const base = process.env.YP_BASEURL ?? ""

    app.get(`/${base}`, (req, res) => res.send("Hello world!"))

    app.use(`/${base}api/library`, serve(library))
    app.use(`/${base}api/explorer`, serve(explorer))

    app.get(`/${base}api/proxy`, async (req, res) => {
        const url = req.query.url as string
        try {
            const response = await globalAxios.get(url, { responseType: "stream" })
            response.data.pipe(res)
        } catch (error: any) {
            // on async handlers express won't do any error handling by default,
            // let's take care of it ourselves.
            logger.error(error)
            res.status(500).json(`${error?.name || "Error"}: ${error?.message || JSON.stringify(error)}`)
        }
    })

    return listen(app, parseNumber(process.env.YP_PORT) ?? 0, "127.0.0.1")
}

main()
    .then(({ address, port }) => {
        logger.info(`backend listening on ${address}:${port}`)
    })
    .catch(error => logger.error(error))
