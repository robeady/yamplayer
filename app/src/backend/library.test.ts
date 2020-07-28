import { GenericContainer, StartedTestContainer, Wait } from "testcontainers"
import { Duration, TemporalUnit } from "node-duration"
import { LibraryStore } from "./library"
import { MariaDB } from "./database"

jest.setTimeout(30000)

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
        db = await MariaDB.connect(container.getMappedPort(3306))
        library = new LibraryStore(db)
    })

    afterEach(async () => {
        await library.clear()
    })

    afterAll(async () => {
        db.closeConnection()
        await container.stop({ removeVolumes: true })
    })

    test("initially empty", async () => {
        expect(await library.list()).toStrictEqual({ tracks: {}, albums: {}, artists: {} })
    })

    test("can list added tracks", async () => {
        const artist = await library.addArtist({ externalId: "3", name: "3", imageUrl: "3" })
        const album = await library.addAlbum({ externalId: "2", title: "2", coverImageUrl: "2", releaseDate: "2" })
        const track = await library.addTrack({
            externalId: "1",
            albumId: album.libraryId,
            artistId: artist.libraryId,
            title: "1",
            durationSecs: 0,
            isrc: null,
        })
        expect(track.albumId).toBe(album.libraryId)
        expect(track.artistId).toBe(artist.libraryId)
        expect(await library.list()).toStrictEqual({
            tracks: {
                [track.libraryId]: {
                    libraryId: track.libraryId,
                    externalId: "1",
                    albumId: album.libraryId,
                    artistId: artist.libraryId,
                    title: "1",
                    durationSecs: 0,
                    isrc: null,
                },
            },
            albums: {
                [album.libraryId]: {
                    libraryId: album.libraryId,
                    externalId: "2",
                    title: "2",
                    coverImageUrl: "2",
                    releaseDate: "2",
                },
            },
            artists: {
                [artist.libraryId]: { libraryId: artist.libraryId, externalId: "3", name: "3", imageUrl: "3" },
            },
        })
    })

    // test("adding existing track sets saved to true", async () => {
    //     const inserted = await library.add(
    //         { externalId: "1", title: "1", durationSecs: 0, isrc: null },
    //         { externalId: "2", title: "2", coverImageUrl: "2", releaseDate: "2" },
    //         { externalId: "3", name: "3", imageUrl: "3" },
    //     )
    //     // TODO there will be a dedicated function for removing from library
    //     await queryBuilder(db)(tables.track).update({ saved: false }).execute()
    //     await library.add(inserted.track.libraryId, inserted.album.libraryId, inserted.artist.libraryId)
    //     // TODO there will be a way to get tracks not saved
    //     const saved = await queryBuilder(db)(tables.track).select(tables.track.saved).fetchOne()
    //     expect(saved).toStrictEqual(true)
    // })

    // test("can match search results", async () => {
    //     const existing = await library.add(
    //         { externalId: "dz:1", title: "1", durationSecs: 0, isrc: null },
    //         { externalId: "dz:2", title: "2", coverImageUrl: "2", releaseDate: "2" },
    //         { externalId: "dz:3", name: "3", imageUrl: "3" },
    //     )
    //     const results = {
    //         externalTrackIds: [],
    //         externalAlbumIds: [],
    //         externalArtistIds: [],
    //     }
    //     const track = { externalId: "dz:1", albumId: "dz:2", artistId: "dz:3", title: "1", isrc: null, durationSecs: 0 }
    //     const album = { externalId: "dz:2", title: "2", releaseDate: null, coverImageUrl: "" }
    //     const artist = { externalId: "dz:3", name: "3", imageUrl: "" }
    //     expect(
    //         await library.match({
    //             results,
    //             tracks: [track],
    //             albums: [album],
    //             artists: [artist],
    //         }),
    //     ).toStrictEqual({
    //         results,
    //         tracks: { [track.externalId]: existing.track.libraryId },
    //         albums: { [album.externalId]: existing.album.libraryId },
    //         artists: { [artist.externalId]: existing.artist.libraryId },
    //     })
    // })
})
