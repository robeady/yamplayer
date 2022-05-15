import { css } from "linaria"
import { orderBy } from "lodash"
import React, { useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { Track } from "../../model"
import { getOrPut } from "../../util/collections"
import { ArtistDetails, ArtistsGrid } from "../components/ArtistsGrid"
import { Page } from "../components/Page"
import { Row } from "../elements"
import { resolveCanonical } from "../state/catalogue"

type Sort = "name" | "tracks"

export function ArtistsPage() {
    const tracks = useSelector(s => s.catalogue.tracks)
    const artists = useSelector(s => s.catalogue.artists)

    const [sort, setSort] = useState<Sort>("name")

    const libraryArtists = useMemo(() => {
        const savedTracks = Object.values(tracks).filter(
            t => typeof t === "object" && t.savedTimestamp !== undefined,
        )

        const artistEntries: Record<string, ArtistDetails> = {}
        for (const track of savedTracks as Track[]) {
            for (const artistId of track.artistIds) {
                const entry = getOrPut(artistEntries, artistId, () => ({
                    trackIds: new Set(),
                    albumIds: new Set(),
                }))
                entry.albumIds.add(track.albumId)
                entry.trackIds.add(track.id)
            }
        }
        return artistEntries
    }, [tracks])

    const orderedArtists = useMemo(
        () =>
            orderBy(
                Object.entries(libraryArtists),
                ([artistId, details]) =>
                    sort === "name" ? resolveCanonical(artists, artistId)?.name : details.trackIds.size,
                [sort === "name" ? "asc" : "desc"],
            ),
        [artists, libraryArtists, sort],
    )

    return (
        <Page
            title="Artists"
            side={
                <Row className={css`align-items: center;`}>
                    <div className={css`margin-right: 8px;`}>Sort by:</div>
                    <select onChange={e => setSort(e.target.value as Sort)}>
                        <option value="name">Name</option>
                        <option value="tracks">Tracks</option>
                    </select>
                </Row>
            }>
            <ArtistsGrid artists={orderedArtists} />
        </Page>
    )
}
