import { css } from "linaria"
import React, { useState } from "react"
import { AlbumsListing } from "./components/AlbumsListing"
import { TrackListing } from "./components/TrackListing"
import { Col, Flex } from "./elements"
import { useExplorerState } from "./state/library"

export function LibraryTracks() {
    const allTracks = useExplorerState(s => s.tracks)
    const libraryTrackIds = Object.entries(allTracks)
        .filter(([_, track]) => typeof track !== "string" && track.savedTimestamp !== null)
        .map(([id]) => id)

    const [view, setView] = useState("playlist" as "playlist" | "tracks")
    const ListComponent = view === "playlist" ? AlbumsListing : TrackListing
    return (
        <Col>
            <Flex className={css`padding-bottom: 25px; align-items: center; gap: 10px;`}>
                <span>View:</span>
                <select value={view} onChange={e => setView(e.target.value as any)}>
                    <option value="playlist">Playlist</option>
                    <option value="tracks">Tracks</option>
                </select>
            </Flex>
            <ListComponent trackIds={libraryTrackIds} />
        </Col>
    )
}
