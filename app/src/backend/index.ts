import express from "express"
import { AddressInfo } from "net"
import { serve } from "./rpc/server"
import { DeezerApiClient } from "./deezer/gateway"

const app = express()
app.use(express.json())

app.use("/deezer", serve(DeezerApiClient.connect()))

const server = app.listen(8280, "127.0.0.1", () => {
    const { address, port } = server.address() as AddressInfo
    console.log(`backend listening on ${address}:${port}`)
    const x = 4
})
