import express from "express"
import { AddressInfo } from "net"
import { serve } from "./rpc/server"
import { DeezerApiClient } from "./deezer/gateway"
import { Library } from "./library"
import { Database } from "./database"

const app = express()
app.use(express.json())

app.use("/deezer", serve(DeezerApiClient.connect()))
app.use("/library", serve(Database.connect().then(db => new Library(db))))

const server = app.listen(8280, "127.0.0.1", () => {
    const { address, port } = server.address() as AddressInfo
    console.log(`backend listening on ${address}:${port}`)
})
