import { orderBy, uniq } from "lodash"
import React, { useMemo } from "react"
import { useSelector } from "react-redux"
import { Track } from "../../model"
import { ArtistsGrid } from "../components/ArtistsGrid"
import { PageTitle } from "../elements"
import { resolveCanonical } from "../state/catalogue"

export function ArtistsPage() {
    const tracks = useSelector(s => s.catalogue.tracks)
    const artists = useSelector(s => s.catalogue.artists)
    const libraryArtists = useMemo(
        () =>
            orderBy(
                uniq(
                    Object.values(tracks)
                        .filter(t => typeof t === "object" && t.savedTimestamp !== undefined)
                        .flatMap(t => (t as Track).artistIds),
                ),
                a => resolveCanonical(artists, a)?.name,
            ),
        [tracks, artists],
    )
    return (
        <div>
            <PageTitle>Artists</PageTitle>
            <ArtistsGrid artistIds={libraryArtists} />
        </div>
    )
}
