import { css } from "linaria"
import { sortBy, sumBy } from "lodash"
import React, { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Album, Track } from "../../model"
import { AlbumContents } from "../components/AlbumContents"
import { AlbumImage } from "../components/AlbumImage"
import { Page } from "../components/Page"
import { Row } from "../elements"
import { plural } from "../elements/plural"
import { catalogue } from "../state/actions"
import { resolveCanonical } from "../state/catalogue"
import { colors } from "../styles"

interface AlbumProps {
    album: Album
    tracks: Track[]
}

export function AlbumPage(props: { albumId: string }) {
    const dispatch = useDispatch()
    const album = useSelector(s => resolveCanonical(s.catalogue.albums, props.albumId))
    const albumArtist = useSelector(s => album && resolveCanonical(s.catalogue.artists, album.artistId))

    // if album and artist are present, and we have as many tracks as the album says it contains,
    // and we have the artists for all the albums, then we don't need to fetch anything

    const [showingAllTracks, setShowingAllTracks] = useState(false)

    const allTracks = useSelector(s => s.catalogue.tracks)
    const allArtists = useSelector(s => s.catalogue.artists)

    const tracks = sortBy(
        Object.values(allTracks).filter(
            (t): t is Track =>
                typeof t !== "string" &&
                (t.albumId === props.albumId || (album?.externalIds?.includes(t.albumId) ?? false)),
        ),
        t => t.discNumber,
        t => t.trackNumber,
    )

    const trackArtists = Object.fromEntries(
        tracks.flatMap(t => t.artistIds).map(a => [a, resolveCanonical(allArtists, a)]),
    )

    const tracksToShow = showingAllTracks ? tracks : tracks.filter(t => t.savedTimestamp !== undefined)

    // TODO: this will fetch what's needed to show whole album even if user doesn't ask for that
    const haveAllData =
        album !== undefined &&
        albumArtist !== undefined &&
        tracks.length === album.numTracks &&
        Object.values(trackArtists).every(a => a !== undefined)

    useEffect(() => {
        if (!haveAllData) {
            dispatch(catalogue.getAlbum(props.albumId))
                .unwrap()
                // TODO: _Toast_
                .catch(error => console.error(error))
        }
    }, [dispatch, props.albumId, haveAllData])

    if (!album || !albumArtist) {
        return null
    }

    return (
        <Page>
            <Row>
                <AlbumSummary album={album} tracks={tracksToShow} />
                <AlbumContents
                    album={album}
                    artist={albumArtist}
                    tracks={tracksToShow}
                    showingAllTracks={showingAllTracks}
                    setShowingAllTracks={setShowingAllTracks}
                    showHeadings
                />
            </Row>
        </Page>
    )
}

function AlbumSummary(props: AlbumProps) {
    return (
        <div className={css`flex: 0 0 300px; padding-right: 50px;`}>
            <AlbumImage album={props.album} size={250} />
            <AlbumStats tracks={props.tracks} totalTracks={props.album.numTracks} />
            <AlbumBlurb />
        </div>
    )
}

function AlbumStats(props: { tracks: Track[]; totalTracks?: number }) {
    const numTracks = props.tracks.length
    const totalMinutes = Math.ceil(sumBy(props.tracks, t => t.durationSecs / 60))

    const numTracksText =
        props.totalTracks === undefined || numTracks === props.totalTracks
            ? numTracks
            : `${numTracks} of ${props.totalTracks}`

    return (
        <div className={css`color: ${colors.gray5}; padding-top: 16px;`}>
            {numTracksText} {plural(numTracks, "track")}, {totalMinutes} {plural(totalMinutes, "minute")}.
        </div>
    )
}

function AlbumBlurb() {
    return (
        <p className={css`font-size: 14px;`}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
            labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
            nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit
            esse cillum dolore eu fugiat nulla pariatur
        </p>
    )
}
