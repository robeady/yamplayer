import { css } from "linaria"
import { sortBy, sumBy } from "lodash"
import React from "react"
import { useSelector } from "react-redux"
import { Link } from "react-router-dom"
import { Album, Track } from "../../model"
import { AlbumImage } from "../components/AlbumImage"
import { TrackTable, TrackTableColumn, TrackTableHeader } from "../components/AlbumTrackTable"
import { Heading, Row } from "../elements"
import { resolveCanonical } from "../state/catalogue"
import { buildAudioQueue } from "../state/queue"
import { colors } from "../styles"

interface AlbumProps {
    album: Album
    // artist: Artist
    tracks: Track[]
}

export function AlbumPage(props: { albumId: string }) {
    const album = useSelector(s => resolveCanonical(s.catalogue.albums, props.albumId))
    // const artist = useSelector(s => resolveCanonical(s.catalogue.artists, album.))
    const tracks = useSelector(s =>
        sortBy(
            Object.values(s.catalogue.tracks).filter(
                (t): t is Track => typeof t !== "string" && t.albumId === props.albumId,
            ),
            t => t.trackNumber,
        ),
    )
    return (
        <Row>
            <AlbumSummary album={album} tracks={tracks} />
            <AlbumDetail album={album} tracks={tracks} />
        </Row>
    )
}

function AlbumDetail(props: AlbumProps) {
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
        </div>
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
    const totalMinutes = sumBy(props.tracks, t => t.durationSecs / 60)
    return (
        <div className={css`color: ${colors.gray6};`}>
            {numTracks} tracks, {totalMinutes} minutes.
        </div>
    )
}

function AlbumBlurb() {
    return (
        <p className={css`font-size: 14px;`}>
            Back to Black is the second and final studio album by English singer and songwriter Amy Winehouse,
            released on 27 October 2006 by Island Records. Winehouse predominantly based the album on her
            tumultuous relationship with then-ex-boyfriend and future husband Blake Fielder-Civil, who
            temporarily left her to pursue his previous ex-girlfriend. Their short-lived separation spurred
            her to create an album that explores themes of guilt, grief, infidelity and heartbreak in a
            relationship.
        </p>
    )
}

function AlbumTitle(props: { title: string }) {
    return <Heading>{props.title}</Heading>
}
function AlbumArtist() {
    return <Link to={`/library/artist/{"catalogueId"}`}>Some Body</Link>
}
