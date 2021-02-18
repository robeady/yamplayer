import { css } from "linaria"
import { styled } from "linaria/lib/react"
import React, { useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Album, Artist, Track } from "../../model"
import { Dict } from "../../util/types"
import { Col, DotDotDot, Flex, Row, Subheading } from "../elements"
import { formatTime } from "../formatting"
import { audio, catalogue, view } from "../state/actions"
import { AudioQueue } from "../state/AudioPlayer"
import { resolveCanonical } from "../state/catalogue"
import { colors, fontSizes } from "../styles"
import { TrackRating } from "./Rating"

interface Row {
    tracks: Track[]
    albumId: string
}

function assembleRows(trackIds: string[], allTracks: Dict<string | Track>) {
    let lastAlbumId = ""
    const rows = [] as Row[]
    for (const trackId of trackIds) {
        const canonicalTrack = resolveCanonical(allTracks, trackId)
        if (canonicalTrack.albumId === lastAlbumId) {
            // append to the last row
            rows[rows.length - 1]!.tracks.push(canonicalTrack)
        } else {
            // clean up the old row, order tracks that appear together from the same album by track number then disc number
            if (rows.length > 0) {
                rows[rows.length - 1]!.tracks.sort(
                    (a, b) =>
                        (a.discNumber ?? 0) - (b.discNumber ?? 0) ||
                        (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
                )
            }
            // now make a new row
            rows.push({ tracks: [canonicalTrack], albumId: canonicalTrack.albumId })
        }
        lastAlbumId = canonicalTrack.albumId
    }
    return rows
}

function buildQueue(rows: Row[], playFromTrackId: string): AudioQueue {
    // 'playFromTrackId' appears somewhere in rows
    // we scan through all the tracks in order and build a queue
    const previous: string[] = []
    let current
    const next: string[] = []
    let target = previous
    for (const row of rows) {
        for (const track of row.tracks) {
            // TODO is it ok to just check catalogue ID here?
            const id = track.catalogueId ?? track.externalId
            if (id === playFromTrackId) {
                current = id
                target = next
            } else {
                target.push(id)
            }
        }
    }
    if (current === undefined) {
        throw new Error("could not find track to play froms")
    }
    return { previous, current, next }
}

/** This component shows a table of tracks, but where consecutive tracks from the same album are grouped together. */
export function AlbumsListing(props: { trackIds: string[] }) {
    // let's fetch all those tracks, because we'll need to iterate over them to find which ones have the same album
    const allTracks = useSelector(s => s.catalogue.tracks)
    const rows = useMemo(() => assembleRows(props.trackIds, allTracks), [allTracks, props.trackIds])
    return (
        <div>
            <Headings />
            {rows.map(({ tracks, albumId }, i) => (
                <AlbumRow
                    key={i /* same album could appear more than once so cannot just use album id */}
                    tracks={tracks}
                    albumId={albumId}
                    buildQueue={tid => buildQueue(rows, tid)}
                />
            ))}
        </div>
    )
}

function Headings() {
    return (
        <Subheading>
            <Row className={css`height: 30px;`}>
                <AlbumArtistCol>Artist / Album</AlbumArtistCol>
                <TrackNumCol>#</TrackNumCol>
                <TrackCol>Track</TrackCol>
                <RatingCol>Rating</RatingCol>
                <LengthCol>Length</LengthCol>
            </Row>
        </Subheading>
    )
}

function AlbumRow(props: { tracks: Track[]; albumId: string; buildQueue: (from: string) => AudioQueue }) {
    const fullSizeThreshold = 9
    const album = useSelector(s => resolveCanonical(s.catalogue.albums, props.albumId))
    const artist = useSelector(s =>
        resolveCanonical(s.catalogue.artists, props.tracks[0]!.artistId /* TODO: get album primary artist */),
    )
    return (
        <Flex
            className={css`
                border-bottom: 1px solid ${colors.gray2};
                font-size: ${fontSizes.tableContent};
            `}>
            {props.tracks.length >= fullSizeThreshold ? (
                <FullSizeAlbumCell album={album} artist={artist} />
            ) : (
                <SmallAlbumCell album={album} artist={artist} />
            )}
            <Col className={css`width: 100%; padding: 10px 0;`}>
                {props.tracks.map(track => (
                    <TrackRow
                        key={track.catalogueId ?? track.externalId}
                        track={track}
                        album={album}
                        artist={artist}
                        buildQueue={props.buildQueue}
                    />
                ))}
            </Col>
        </Flex>
    )
}

function FullSizeAlbumCell(props: { album: Album; artist: Artist }) {
    return (
        <AlbumArtistCol
            className={css`
                gap: 8px;
                padding-top: 6px;
                overflow: hidden;
            `}>
            <img
                className={css`border-radius: 10px;`}
                src={props.album.coverImageUrl ?? undefined}
                width={230}
                height={230}
            />
            <Col>
                <AlbumTitle title={props.album.title} />
                <ArtistName name={props.artist.name} />
            </Col>
        </AlbumArtistCol>
    )
}

function SmallAlbumCell(props: { album: Album; artist: Artist }) {
    return (
        <AlbumArtistCol
            className={css`
                display: flex;
                gap: 10px;
                align-items: center;
                overflow: hidden;
            `}>
            <img
                className={css`border-radius: 3px;`}
                src={props.album.coverImageUrl ?? undefined}
                width={36}
                height={36}
            />
            <Col
                className={css`
                    overflow: hidden;
                    margin-top: -1px; // shift up
                    line-height: 1.4;
                `}>
                <AlbumTitle title={props.album.title} />
                <ArtistName name={props.artist.name} />
            </Col>
        </AlbumArtistCol>
    )
}

function AlbumTitle({ title = "" }) {
    return <DotDotDot className={css``}>{title}</DotDotDot>
}

function ArtistName({ name = "" }) {
    return (
        <DotDotDot className={css`color: ${colors.gray6}; font-size: ${fontSizes.tableSecondary};`}>
            {name}
        </DotDotDot>
    )
}

function TrackRow(props: {
    track: Track
    album: Album
    artist: Artist
    buildQueue: (from: string) => AudioQueue
}) {
    const dispatch = useDispatch()

    const trackId = props.track.catalogueId ?? props.track.externalId
    const selected = useSelector(s => s.view.selectedTrackId)
    const TrackComponent = selected === trackId ? SelectedTrackFlex : TrackFlex

    return (
        <TrackComponent
            onMouseDown={() => dispatch(view.selectedTrackChanged(trackId))}
            onDoubleClick={() => dispatch(audio.play(props.buildQueue(trackId)))}
            className={css``}>
            <TrackNumCol>{props.track.trackNumber}</TrackNumCol>
            <TrackCol>{props.track.title}</TrackCol>
            <RatingCol>
                <TrackRating
                    rating={props.track.rating}
                    enabled={props.track.catalogueId !== null}
                    onRate={newRating => dispatch(catalogue.setTrackRating({ trackId, newRating }))}
                />
            </RatingCol>
            <LengthCol>{formatTime(props.track.durationSecs)}</LengthCol>
        </TrackComponent>
    )
}

const TrackFlex = styled.div`
    display: flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 6px;
    &:last-child {
        border-bottom: 0;
    }
    &:hover {
        background: ${colors.gray1};
    }
`

const SelectedTrackFlex = styled(TrackFlex)`
    background: ${colors.purple9};
    &:hover {
        background: ${colors.purple8};
    }
`

const TableCol = styled.div`padding-right: 20px;`

const AlbumArtistCol = styled(TableCol)`flex: 0 0 274px;`
const TrackNumCol = styled(TableCol)`flex: 0 0 40px; text-align: right; color: ${colors.gray6};`
const TrackCol = styled(TableCol)`flex: 0 0 500px;`
const RatingCol = styled(TableCol)`flex: 0 0 100px;`
const LengthCol = styled(TableCol)`flex: 0 0 100px;`
