import React from "react"
import { useSelector } from "react-redux"
import { AlbumsRow } from "../components/AlbumsRow"
import { Page } from "../components/Page"
import { TracksGrid } from "../components/TracksGrid"

export function DiscoveryPage() {
    const discovery = useSelector(s => s.catalogue.discovery)

    return (
        <Page title="Discovery">
            <h2>Top Songs</h2>
            <TracksGrid tracks={discovery?.topTracks ?? []} />
            <h2>New Releases</h2>
            <AlbumsRow albums={discovery?.newReleases ?? []} />
        </Page>
    )
}
