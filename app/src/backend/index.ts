import express from "express"
import { AddressInfo } from "net"
import { serve } from "./rpc/server"
import { DeezerApiClient } from "./deezer/gateway"
import { LibraryStore } from "./library"
import { MariaDB } from "./database"
import { Explorer } from "./explorer"

const app = express()
app.use(express.json())

const deezer = DeezerApiClient.connect()
const db = MariaDB.connect()

app.use("/deezer", serve(deezer))
app.use("/library", serve(db.then(db => new LibraryStore(db))))
app.use(
    "/explorer",
    serve(Promise.all([deezer, db]).then(([deezer, db]) => new Explorer(new LibraryStore(db), deezer))),
)

const server = app.listen(8280, "127.0.0.1", () => {
    const { address, port } = server.address() as AddressInfo
    console.log(`backend listening on ${address}:${port}`)
})
