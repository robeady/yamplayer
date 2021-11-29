import { css } from "linaria"
import { sortBy, sumBy } from "lodash"
import React, { Dispatch, SetStateAction, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-dom"
import { Album, Track } from "../../model"
import { AlbumImage } from "../components/AlbumImage"
import { TrackTable, TrackTableColumnKey, TrackTableHeadings } from "../components/TrackTable"
import { Heading, Row } from "../elements"
import { LinkButton } from "../elements/LinkButton"
import { plural } from "../elements/plural"
import { catalogue } from "../state/actions"
import { resolveCanonical } from "../state/catalogue"
import { buildAudioQueue } from "../state/queue"
import { colors } from "../styles"

interface AlbumProps {
    album: Album
    // artist: Artist
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
                typeof t !== "string" && (t.albumId === props.albumId || t.albumId === album?.externalId),
        ),
        t => t.discNumber,
        t => t.trackNumber,
    )

    const trackArtists = Object.fromEntries(
        tracks.flatMap(t => t.artistIds).map(a => [a, resolveCanonical(allArtists, a)]),
    )

    const tracksToShow = showingAllTracks ? tracks : tracks.filter(t => t.savedTimestamp !== null)

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

    if (album === undefined) {
        return null
    }

    return (
        <Row>
            <AlbumSummary album={album} tracks={tracksToShow} />
            <AlbumDetail
                album={album}
                tracks={tracksToShow}
                showingAllTracks={showingAllTracks}
                setShowingAllTracks={setShowingAllTracks}
            />
        </Row>
    )
}

function AlbumDetail(
    props: AlbumProps & { showingAllTracks: boolean; setShowingAllTracks: Setter<boolean> },
) {
    const tableCols: TrackTableColumnKey[] = ["#", "title", "artist", "length"]

    return (
        <div className={css`flex: 1;`}>
            <AlbumTitle title={props.album.title} />
            <AlbumArtist />
            <TrackTableHeadings cols={tableCols} />
            <TrackTable
                tracks={props.tracks}
                cols={tableCols}
                buildTrackQueue={trackId =>
                    buildAudioQueue(
                        props.tracks.map(t => t.catalogueId ?? t.externalId),
                        trackId,
                    )
                }
            />
            {props.album.numTracks === null ||
                ((props.album.numTracks > props.tracks.length || props.showingAllTracks) && (
                    <WholeAlbumToggle
                        showingAllTracks={props.showingAllTracks}
                        setShowingAllTracks={props.setShowingAllTracks}
                    />
                ))}
        </div>
    )
}

type Setter<T> = Dispatch<SetStateAction<T>>

function WholeAlbumToggle(props: { showingAllTracks: boolean; setShowingAllTracks: Setter<boolean> }) {
    return (
        <LinkButton onClick={() => props.setShowingAllTracks(s => !s)}>
            {props.showingAllTracks ? "Show only tracks in library" : "Show whole album"}
        </LinkButton>
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

function AlbumStats(props: { tracks: Track[]; totalTracks: number | null }) {
    const numTracks = props.tracks.length
    const totalMinutes = Math.ceil(sumBy(props.tracks, t => t.durationSecs / 60))

    const numTracksText =
        props.totalTracks !== null && numTracks === props.totalTracks
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

function AlbumTitle(props: { title: string }) {
    return <Heading>{props.title}</Heading>
}
function AlbumArtist() {
    return (
        <div className={css`padding-bottom: 16px;`}>
            <Link to={`/library/artist/{"catalogueId"}`}>Some Body</Link>
        </div>
    )
}
