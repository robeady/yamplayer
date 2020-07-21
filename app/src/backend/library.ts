import { Database } from "./database"
import { Dict } from "../util/types"
import { queryBuilder, QueryBuilder } from "./database/dsl/impl"
import * as tables from "./database/tables"
import { AlbumId, ArtistId } from "../model/ids"

interface Track {
    title: string
    albumId: AlbumId
    artistId: ArtistId
    durationSecs: number
}

interface Album {
    title: string
    coverImageUrl: string | null
}

interface Artist {
    name: string
}

export class Library {
    qb: QueryBuilder
    constructor(private database: Database) {
        this.qb = queryBuilder(database)
    }

    async list(): Promise<{ tracks: Dict<Track>; albums: Dict<Album>; artists: Dict<Artist> }> {
        const { track, artist, album } = tables
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
            tracks[trackId] = {
                albumId: row.track.albumId as AlbumId,
                artistId: row.track.artistId as ArtistId,
                title: row.track.title,
                durationSecs: row.track.durationSecs,
            }

            const albumId = row.album.albumId
            delete row.album.albumId
            albums[albumId] = row.album

            const artistId = row.artist.artistId
            delete row.artist.artistId
            artists[artistId] = row.artist
        }
        return { tracks, artists, albums }
    }

    async addTrack(track: Track, externalId: string): Promise<number> {
        const { lastInsertedId } = await this.qb(tables.track)
            .insert({
                albumId: track.albumId,
                artistId: track.artistId,
                title: track.title,
                isrc: null,
                durationSecs: track.durationSecs,
            })
            .execute()
        return lastInsertedId
    }
}
