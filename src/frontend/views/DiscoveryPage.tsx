import React from "react"
import { useSelector } from "react-redux"
import { AlbumsRow } from "../components/AlbumsRow"
import { TracksGrid } from "../components/TracksGrid"
import { PageTitle } from "../elements"

export function DiscoveryPage() {
    const discovery = useSelector(s => s.catalogue.discovery)

    return (
        <div>
            <PageTitle>Discovery</PageTitle>
            <h2>Top Songs</h2>
            <TracksGrid tracks={discovery?.topSongs ?? []} />
            <h2>New Releases</h2>
            <AlbumsRow albums={discovery?.newReleases ?? []} />
        </div>
    )
}
