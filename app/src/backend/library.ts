import { Database } from "./database"
import { Dict } from "../util/types"
import { queryBuilder, QueryBuilder } from "./database/dsl/impl"
import { track, album, artist } from "./database/tables"

interface Track {
    title: string
    albumId: string
    artistId: string
}
interface TrackRow extends Track {
    trackId: string
}

interface Album {
    title: string
    coverImageUrl: string
}
interface AlbumRow extends Album {
    albumId: string
}

interface Artist {
    name: string
}
interface ArtistRow extends Artist {
    artistId: string
}

export class Library {
    qb: QueryBuilder
    constructor(private database: Database) {
        this.qb = queryBuilder(database)
    }

    async list(): Promise<{ tracks: Dict<Track>; albums: Dict<Album>; artists: Dict<Artist> }> {
        const rows = await this.qb(track)
            .innerJoin(album)
            .on(album.albumId, "=", track.albumId)
            .innerJoin(artist)
            .on(artist.artistId, "=", track.artistId)
            .fetch()

        const tracks = {} as Dict<Track>
        const artists = {} as Dict<Artist>
        const albums = {} as Dict<Album>
        for (const row of rows) {
            const trackId = row.track.trackId
            delete row.track.trackId
            tracks[trackId] = row.track

            const albumId = row.album.albumId
            delete row.album.albumId
            albums[albumId] = row.album

            const artistId = row.artist.artistId
            delete row.artist.artistId
            artists[artistId] = row.artist
        }
        return { tracks, artists, albums }
    }

    async addTrack(track: Track, externalId: string): Promise<string> {
        await this.database.execute(`INSERT INTO track VALUES ()`)
        return ""
    }
}
