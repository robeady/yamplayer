import { Database } from "./database"
import { Dict } from "../util/types"

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
    constructor(private database: Database) {}

    async list(): Promise<{ tracks: Dict<Track>; albums: Dict<Album>; artists: Dict<Artist> }> {
        const rows = await this.database.query<{ track: TrackRow; album: AlbumRow; artist: ArtistRow }>(`
            SELECT * from track
            INNER JOIN albums ON album.albumId = track.albumId
            INNER JOIN artists ON artist.artistId = track.artistId`)
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
    }
}

const artist = table<"artist", ArtistRow, {}>("artist")

const wrong = table<"wrong", {}, {}>("wrong")
const track = table<"track", TrackRow, { albumId: typeof artist }>("track", { albumId: artist })
