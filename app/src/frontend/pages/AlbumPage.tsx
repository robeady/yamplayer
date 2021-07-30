import { css } from "linaria"
import { sortBy, sumBy } from "lodash"
import React, { Dispatch, SetStateAction, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-dom"
import { Album, Track } from "../../model"
import { AlbumImage } from "../components/AlbumImage"
import { TrackTable, TrackTableColumn, TrackTableHeader } from "../components/AlbumTrackTable"
import { Heading, Row } from "../elements"
import { LinkButton } from "../elements/LinkButton"
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
    useEffect(() => {
        dispatch(catalogue.getAlbum(props.albumId))
            .unwrap()
            // TODO: some kind of toast
            .catch(error => console.error(error))
    }, [dispatch, props.albumId])

    // const artist = useSelector(s => resolveCanonical(s.catalogue.artists, album.))

    const [showingAllTracks, setShowingAllTracks] = useState(false)

    const tracks = useSelector(s =>
        sortBy(
            Object.values(s.catalogue.tracks).filter(
                (t): t is Track =>
                    typeof t !== "string" && (t.albumId === props.albumId || t.albumId === album?.externalId),
            ),
            t => t.trackNumber,
        ),
    )

    if (album === undefined) {
        return null
    }

    const tracksToShow = showingAllTracks ? tracks : tracks.filter(t => t.savedTimestamp !== null)

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
    const tableCols: TrackTableColumn[] = ["#", "title", "artist", "duration"]

    return (
        <div className={css`flex: 1;`}>
            <AlbumTitle title={props.album.title} />
            <AlbumArtist />
            <TrackTableHeader cols={tableCols} />
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
        <div className={css`flex: 0 0 400px;`}>
            <AlbumImage album={props.album} size={250} />
            <AlbumStats tracks={props.tracks} />
            <AlbumBlurb />
        </div>
    )
}

function AlbumStats(props: { tracks: Track[] }) {
    const numTracks = props.tracks.length
    const totalMinutes = Math.ceil(sumBy(props.tracks, t => t.durationSecs / 60))
    return (
        <div className={css`color: ${colors.gray6};`}>
            {numTracks} tracks, {totalMinutes} minutes.
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
    return <Link to={`/library/artist/{"catalogueId"}`}>Some Body</Link>
}
