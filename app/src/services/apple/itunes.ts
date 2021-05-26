import { parse } from "plist"
import { isoToTimestamp } from "../../util/time"
import { Fraction, Timestamp } from "../../util/types"

export interface ItunesLibraryContents {
    tracks: ItunesTrack[]
    playlists: { name: string }[]
}

export interface ItunesTrack {
    title: string
    artistName: string
    albumName: string
    durationSecs?: number
    rating?: Fraction
    playCount?: number
    dateAdded?: Timestamp
}

/**
 * Takes an itunes XML file and produces a list of tracks etc from it. These will need to be looked up in
 * some music service to actually play the tracks.
 */
export function parseItunesLibraryXml(xmlContents: string): ItunesLibraryContents {
    // research suggests that the following fields are always present
    // Track ID
    // Persistent ID
    // Track Type
    // Name
    // Artist
    // Album
    // Genre
    // Kind
    const parsed = parse(xmlContents) as any
    const tracks = Object.entries(parsed["Tracks"]).map(([_id, data]: [string, any]) => {
        const result: ItunesTrack = {
            title: data["Name"],
            artistName: data["Artist"],
            albumName: data["Album"],
            durationSecs: "Total Time" in data ? data["Total Time"] / 1000 : undefined,
            rating: "Rating" in data && !data["Rating Computed"] ? data["Rating"] / 100 : undefined,
            playCount: data["Play Count"],
            dateAdded: "Date Added" in data ? isoToTimestamp(data["Date Added"]) : undefined,
        }
        return result
    })
    const playlists = Object.entries(parsed["Playlists"]).map(([_id, data]: [string, any]) => {
        const name = data["Name"] as string
        return { name }
    })
    return { tracks, playlists }
}
