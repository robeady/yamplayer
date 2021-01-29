import express from "express"
import { Server } from "http"
import { AddressInfo } from "net"
import albumResponse from "./albumResponse.json"
import artistResponse from "./artistResponse.json"
import { DeezerApiClient } from "./index"
import searchResponse from "./searchResponse.json"
import trackResponse from "./trackResponse.json"

let mockDeezerServer: Server
let deezerClient: DeezerApiClient

beforeAll(done => {
    const app = express()
    app.use(express.json())
    app.get("/search", (req, res) => res.json(searchResponse))
    app.get("/track/3135553", (req, res) => res.json(trackResponse))
    app.get("/album/302127", (req, res) => res.json(albumResponse))
    app.get("/artist/27", (req, res) => res.json(artistResponse))
    app.use((err: any, req: any, res: any, next: any) => {
        if (err) console.log(err)
        next(err)
    })
    mockDeezerServer = app.listen(0, "127.0.0.1", () => {
        const { address, port } = mockDeezerServer.address() as AddressInfo
        const baseUrl = `http://${address}:${port}`
        DeezerApiClient.create({ apiBaseUrl: baseUrl, rateLimit: false }).then(client => {
            deezerClient = client
            done()
        })
    })
})

afterAll(() => {
    mockDeezerServer.close()
})

test("fetch search results", async () => {
    const results = await deezerClient.searchTracks("eminem")
    expect(results.tracks["dz:854914332"]).toStrictEqual({
        externalId: "dz:854914332",
        albumId: "dz:127270232",
        artistId: "dz:13",
        title: "Darkness",
        discNumber: null,
        trackNumber: null,
        isrc: null,
        durationSecs: 337,
        rating: null,
    })
    expect(results.albums["dz:127270232"]).toStrictEqual({
        externalId: "dz:127270232",
        title: "Music To Be Murdered By",
        coverImageUrl:
            "https://cdns-images.dzcdn.net/images/cover/4d00a7848dc8af475973ff1761ad828d/250x250-000000-80-0-0.jpg",
        releaseDate: null,
    })
    expect(results.artists["dz:13"]).toStrictEqual({
        externalId: "dz:13",
        name: "Eminem",
        imageUrl:
            "https://cdns-images.dzcdn.net/images/artist/0707267475580b1b82f4da20a1b295c6/250x250-000000-80-0-0.jpg",
    })
})

test("fetch track", async () => {
    const result = await deezerClient.lookupTrack("dz:3135553")
    expect(result).toStrictEqual({
        externalId: "dz:3135553",
        albumId: "dz:302127",
        artistId: "dz:27",
        title: "One More Time",
        durationSecs: 320,
        isrc: "GBDUW0000053",
        rating: null,
        discNumber: 1,
        trackNumber: 1,
    })
})

test("fetch album", async () => {
    const result = await deezerClient.lookupAlbum("dz:302127")
    expect(result).toStrictEqual({
        externalId: "dz:302127",
        title: "Discovery",
        releaseDate: "2001-03-07",
        coverImageUrl:
            "https://e-cdns-images.dzcdn.net/images/cover/2e018122cb56986277102d2041a592c8/250x250-000000-80-0-0.jpg",
    })
})

test("fetch artist", async () => {
    const result = await deezerClient.lookupArtist("dz:27")
    expect(result).toStrictEqual({
        externalId: "dz:27",
        name: "Daft Punk",
        imageUrl:
            "https://cdns-images.dzcdn.net/images/artist/f2bc007e9133c946ac3c3907ddc5d2ea/250x250-000000-80-0-0.jpg",
    })
})
