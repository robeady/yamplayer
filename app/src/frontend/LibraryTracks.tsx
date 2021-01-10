import React from "react"
import { TrackListing } from "./components/TrackListing"
import { useExplorerState } from "./library/library"

export function LibraryTracks() {
    const allTracks = useExplorerState(s => s.tracks)
    const libraryTrackIds = Object.entries(allTracks)
        .filter(([_, track]) => typeof track !== "string" && track.savedTimestamp !== null)
        .map(([id]) => id)
    return (
        <div>
            <TrackListing trackIds={libraryTrackIds} />
        </div>
    )
}
