import { Duration, TemporalUnit } from "node-duration"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers"
import { Timestamp } from "../util/types"
import { MariaDB } from "./database/handle"
import { LibraryContents } from "./explorer"
import { LibraryStore } from "./library"

jest.setTimeout(30_000)

describe("library store tests", () => {
    let container: StartedTestContainer
    let db: MariaDB
    let library: LibraryStore
    beforeAll(async () => {
        container = await new GenericContainer("mariadb", "10.2.31")
            .withEnv("MYSQL_ROOT_PASSWORD", "hunter2")
            .withEnv("MYSQL_DATABASE", "yamplayer")
            .withEnv("MYSQL_USER", "yamplayer_user")
            .withEnv("MYSQL_PASSWORD", "hunter2")
            .withExposedPorts(3306)
            .withHealthCheck({
                test: "mysqladmin ping --password=hunter2 --host=127.0.0.1",
                interval: new Duration(0.5, TemporalUnit.SECONDS),
                retries: 30,
                timeout: new Duration(0.5, TemporalUnit.SECONDS),
            })
            .withWaitStrategy(Wait.forHealthCheck())
            .start()
        db = MariaDB.connect({
            port: container.getMappedPort(3306),
            user: "yamplayer_user",
            password: "hunter2",
        })
        library = await LibraryStore.setup(db, () => 0 as Timestamp)
    })

    afterEach(async () => {
        await library.clear()
    })

    afterAll(async () => {
        await db.closeConnection()
        await container.stop({ removeVolumes: true })
    })

    test("initially empty", async () => {
        const expected: LibraryContents = { tracks: {}, albums: {}, artists: {} }
        expect(await library.list()).toStrictEqual(expected)
    })

    test("can list added tracks", async () => {
        const artist = await library.addArtist({
            id: "ext:3",
            name: "3",
            imageUrl: "3",
        })
        const album = await library.addAlbum({
            id: "ext:2",
            artistId: artist.id,
            title: "2",
            coverImageUrl: "2",
            releaseDate: "2",
            numTracks: 1,
        })
        const track = await library.addTrack({
            id: "ext:1",
            albumId: album.id,
            artistIds: [artist.id],
            title: "1",
            trackNumber: 1,
            discNumber: 1,
            durationSecs: 0,
            rating: 2,
        })
        expect(track.albumId).toBe(album.id)
        expect(track.artistIds).toStrictEqual([artist.id])
        const expectedContents: LibraryContents = {
            tracks: {
                [track.id]: {
                    id: track.id,
                    externalIds: ["ext:1"],
                    albumId: album.id,
                    artistIds: [artist.id],
                    title: "1",
                    trackNumber: 1,
                    discNumber: 1,
                    durationSecs: 0,
                    savedTimestamp: 0 as Timestamp,
                    rating: 2,
                    cataloguedTimestamp: 0 as Timestamp,
                },
            },
            albums: {
                [album.id]: {
                    id: album.id,
                    cataloguedTimestamp: 0 as Timestamp,
                    externalIds: ["ext:2"],
                    artistId: artist.id,
                    title: "2",
                    coverImageUrl: "2",
                    releaseDate: "2",
                    numTracks: 1,
                },
            },
            artists: {
                [artist.id]: {
                    id: artist.id,
                    cataloguedTimestamp: 0 as Timestamp,
                    externalIds: ["ext:3"],
                    name: "3",
                    imageUrl: "3",
                },
            },
        }
        expect(await library.list()).toEqual(expectedContents)
    })

    test("can list added playlists", async () => {
        const playlist = await library.addPlaylist({ name: "pl1" })
        expect(await library.listPlaylists()).toStrictEqual({ [playlist.id]: playlist })
    })
})
