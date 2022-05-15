import { uniq } from "lodash"
import React, { useMemo } from "react"
import { useSelector } from "react-redux"
import { Track } from "../../model"
import { AlbumsGrid } from "../components/AlbumsGrid"
import { Page } from "../components/Page"

export function LibraryAlbumsPage() {
    const tracks = useSelector(s => s.catalogue.tracks)
    const libraryAlbums = useMemo(
        () =>
            uniq(
                Object.values(tracks)
                    .filter(t => typeof t === "object" && t.savedTimestamp !== undefined)
                    .map(t => (t as Track).albumId),
            ),
        [tracks],
    )
    return (
        <Page title="Albums">
            <AlbumsGrid albumIds={libraryAlbums} />
        </Page>
    )
}
