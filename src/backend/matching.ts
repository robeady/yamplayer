import { groupBy, intersection, keyBy } from "lodash"
import { ExternalTrack } from "../model"
import { Service } from "../services"
import { ItunesLibraryContents, ItunesTrack } from "../services/apple/itunes"
import { moduleLogger } from "./logging"

const logger = moduleLogger(module)

export async function matchItunesLibrary(
    itunesLibraryContents: ItunesLibraryContents,
    service: Pick<Service, "lookupTrack" | "lookupAlbum" | "lookupArtist" | "searchTracks">,
) {
    // TODO: some error handling
    const matchedTracks: { track: ItunesTrack; matches: ExternalTrack[]; chosenMatchIdx?: number }[] = []

    // TODO: for now we limit import to 200 tracks
    for (const track of itunesLibraryContents.tracks
        // order by date added, descending
        .sort((t1, t2) => (t2.dateAdded ?? 0) - (t1.dateAdded ?? 0))
        // take first 200 tracks, for the time being
        .slice(0, 200)) {
        const matches = await searchForItunesTrack(service, track)
        if (matches.results.externalTrackIds.length === 0) {
            // TODO: inform the user that we failed to match this track
            logger.warn(`failed to match itunes track ${track.title} by ${track.artistName}`)
        } else {
            matchedTracks.push({
                track,
                matches: matches.results.externalTrackIds.map(etid => matches.tracks[etid]!)!,
            })
        }
    }

    // now we try to pick the best match for each itunes track by grouping by album
    // (unfortunately we don't get the actual album ID)
    const matchedTracksGroupedByItunesAlbum = Object.values(
        groupBy(matchedTracks, m => `${m.track.albumName}|${m.track.albumArtist}`),
    )

    for (const tracks of matchedTracksGroupedByItunesAlbum.values()) {
        const albumIds = tracks.map(t => t.matches.map(m => m.albumId))
        const everPresentAlbumIds = intersection(...albumIds)
        if (everPresentAlbumIds.length > 0) {
            const albumId = everPresentAlbumIds[0]!
            for (const track of tracks) {
                track.chosenMatchIdx = track.matches.findIndex(m => m.albumId === albumId)
            }
        }
    }

    // now let's collect up the results of the matching
    const matchedTracksByExternalId = keyBy(
        matchedTracksGroupedByItunesAlbum.flat().map(matchedTrack => ({
            itunesTrack: matchedTrack.track,
            matchedTrack: matchedTrack.matches[matchedTrack.chosenMatchIdx ?? 0]!,
        })),
        t => t.matchedTrack.externalId,
    )

    return matchedTracksByExternalId
}

async function searchForItunesTrack(
    service: Pick<Service, "searchTracks">,
    { title, albumName, artistName, durationSecs }: ItunesTrack,
) {
    // this code was inspired by a previous effort, search_dz.py
    const query = {
        title,
        albumName,
        artistName,
        ...(durationSecs !== undefined && {
            minDurationSecs: Math.floor(durationSecs - 10),
            maxDurationSecs: Math.ceil(durationSecs + 10),
        }),
    }
    const matches = await service.searchTracks(query)
    if (matches.results.externalTrackIds.length > 0) {
        return matches
    }

    // if no match, try removing stuff in brackets in the song or album title
    const query2 = {
        ...query,
        title: removeStuffInBrackets(query.title),
        albumName: removeStuffInBrackets(query.albumName),
    }
    return service.searchTracks(query2)
}

function removeStuffInBrackets(s: string): string {
    return s.replace(/\[.*?\]|\(.*?\)/gu, "")
}
