import { uniq } from "lodash"
import React, { useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { filterMap } from "../../util/collections"
import { AlbumsRow } from "../components/AlbumsRow"
import { Page } from "../components/Page"
import { catalogue } from "../state/actions"
import { resolveCanonical } from "../state/catalogue"

export function ArtistPage(props: { artistId: string }) {
    const dispatch = useDispatch()

    const artist = useSelector(s => resolveCanonical(s.catalogue.artists, props.artistId))
    const tracks = useSelector(s => s.catalogue.tracks)

    const artistTopTracks = useSelector(s => s.catalogue.artistTopTracks[props.artistId])

    const albums = useSelector(s => s.catalogue.albums)

    const ownAlbumIds = useMemo(
        () =>
            Object.values(filterMap(albums, a => (typeof a === "object" ? a : undefined)))
                .filter(a => a.artistId === props.artistId)
                .map(a => a.id),
        [props.artistId, albums],
    )

    const albumIdsWithSomeSavedTrack = useMemo(
        () =>
            uniq(
                // TODO: this shows all albums featuring artist not albums _by_ them. is that what we want?
                Object.values(
                    filterMap(tracks, t =>
                        typeof t === "object" && t.cataloguedTimestamp !== undefined ? t : undefined,
                    ),
                )
                    .filter(t => t.artistIds.includes(props.artistId))
                    .map(t => t.albumId),
            ),
        [props.artistId, tracks],
    )

    useEffect(() => {
        // note: if we have artist and artistTopTracks, we also have their albums
        if (!artistTopTracks || !artist) {
            dispatch(catalogue.getArtist(props.artistId))
                .unwrap()
                // TODO: _Toast_
                .catch(error => console.error(error))
        }
    })

    return (
        <Page title={artist?.name}>
            <h2>In Library</h2>
            <AlbumsRow albums={albumIdsWithSomeSavedTrack} />
            <h2>Wot are they up to??</h2>
            <AlbumsRow albums={ownAlbumIds} />
        </Page>
    )
}
