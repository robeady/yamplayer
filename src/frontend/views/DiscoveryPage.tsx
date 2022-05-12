import React from "react"
import { useSelector } from "react-redux"
import { TrackGrid } from "../components/TrackGrid"
import { PageTitle } from "../elements"

export function DiscoveryPage() {
    const discovery = useSelector(s => s.catalogue.discovery)

    return (
        <div>
            <PageTitle>Discovery</PageTitle>
            <h2>Top Songs</h2>
            <TrackGrid tracks={discovery?.topSongs ?? []} />
        </div>
    )
}
