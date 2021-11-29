import { css } from "linaria"
import React, { useState } from "react"
import { useSelector } from "react-redux"
import { TrackListByAlbum } from "./components/TrackListByAlbum"
import { TrackListLegacy } from "./components/TrackListLegacy"
import { Row } from "./elements"

export function LibraryTracks() {
    const allTracks = useSelector(s => s.catalogue.tracks)
    const libraryTrackIds = Object.entries(allTracks)
        .filter(([, track]) => typeof track !== "string" && track.savedTimestamp !== null)
        .map(([id]) => id)

    const [view, setView] = useState("playlist" as "playlist" | "tracks")
    const ListComponent = view === "playlist" ? TrackListByAlbum : TrackListLegacy
    return (
        <div>
            <Row className={css`padding-bottom: 25px; align-items: center; gap: 10px;`}>
                <span>View:</span>
                <select value={view} onChange={e => setView(e.target.value as any)}>
                    <option value="playlist">Playlist</option>
                    <option value="tracks">Tracks</option>
                </select>
            </Row>
            <ListComponent trackIds={libraryTrackIds} />
        </div>
    )
}
