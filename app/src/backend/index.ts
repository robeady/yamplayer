import express from "express"
import { AddressInfo } from "net"
import { serve } from "./rpc/server"
import { DeezerApiClient } from "../services/deezer"
import { LibraryStore } from "./library"
import { MariaDB } from "./database"
import { Explorer } from "./explorer"
import { Resolver } from "../services/plugins"

const app = express()
app.use(express.json())

const db = MariaDB.connect()

app.use("/library", serve(db.then(db => new LibraryStore(db))))
app.use("/explorer", serve(db.then(db => new Explorer(new LibraryStore(db), new DeezerApiClient(), new Resolver()))))

const server = app.listen(8280, "127.0.0.1", () => {
    const { address, port } = server.address() as AddressInfo
    console.log(`backend listening on ${address}:${port}`)
})
