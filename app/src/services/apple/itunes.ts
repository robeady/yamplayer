import { parse } from "plist"
import { Fraction } from "../../util/types"

export interface ItunesLibraryContents {
    tracks: ItunesTrack[]
}

export interface ItunesTrack {
    title: string
    artistName: string
    albumName: string
    durationSecs: number
    rating: Fraction | null
}

/**
 * Takes an itunes XML file and produces a list of tracks etc from it. These will need to be looked up in
 * some music service to actually play the tracks.
 */
export function parseItunesLibraryXml(xmlContents: string): ItunesLibraryContents {
    const parsed = parse(xmlContents) as any
    const tracks = Object.entries(parsed["Tracks"]).map(([_id, data]: [string, any]) => {
        return {
            title: data["Name"],
            artistName: data["Artist"],
            albumName: data["Album"],
            durationSecs: data["Total Time"] / 1000,
            rating: "Rating" in data ? data["Rating"] / 100 : null,
        }
    })
    const _playlists = Object.entries(parsed["Playlists"]).map(([_id, _data]) => {
        return null // TODO _NoItunesPlaylistsYet_
    })
    return { tracks }
}
