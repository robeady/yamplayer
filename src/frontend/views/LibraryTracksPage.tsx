import { css } from "linaria"
import React, { useState } from "react"
import { useSelector } from "react-redux"
import { Page } from "../components/Page"
import { TrackListByAlbum } from "../components/TrackListByAlbum"
import { TrackListLegacy } from "../components/TrackListLegacy"
import { Row } from "../elements"

export function LibraryTracksPage() {
    const allTracks = useSelector(s => s.catalogue.tracks)
    const libraryTrackIds = Object.entries(allTracks)
        .filter(([, track]) => typeof track !== "string" && track.savedTimestamp !== undefined)
        .map(([id]) => id)

    const [view, setView] = useState("playlist" as "playlist" | "tracks")
    const ListComponent = view === "playlist" ? TrackListByAlbum : TrackListLegacy
    return (
        <Page>
            <Row className={css`padding-bottom: 25px; align-items: center; gap: 10px;`}>
                <span>View:</span>
                <select value={view} onChange={e => setView(e.target.value as any)}>
                    <option value="playlist">Playlist</option>
                    <option value="tracks">Tracks</option>
                </select>
            </Row>
            <ListComponent trackIds={libraryTrackIds} />
        </Page>
    )
}
