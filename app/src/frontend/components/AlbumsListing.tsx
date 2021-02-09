import { css } from "linaria"
import { styled } from "linaria/lib/react"
import React, { useState } from "react"
import { Album, Artist, Track } from "../../model"
import { Col, DotDotDot, Flex, Subheading } from "../elements"
import { formatTime } from "../formatting"
import { createState } from "../state"
import { resolveCanonical, useExplorerDispatch, useExplorerState } from "../state/library"
import { usePlayerDispatch } from "../state/playback"
import { colors, fontSizes } from "../styles"
import { TrackRating } from "./Rating"

const SelectedTrackId = createState((props: {}) => useState<string>())

/** This component shows a table of tracks, but where consecutive tracks from the same album are grouped together. */
export function AlbumsListing(props: { trackIds: string[] }) {
    // let's fetch all those tracks, because we'll need to iterate over them to find which ones have the same album
    const allTracks = useExplorerState(s => s.tracks)
    let lastAlbumId = ""
    const rows = [] as { tracks: Track[]; albumId: string }[]
    for (const trackId of props.trackIds) {
        const canonicalTrack = resolveCanonical(allTracks, trackId)
        if (canonicalTrack.albumId === lastAlbumId) {
            // append to the last row
            rows[rows.length - 1].tracks.push(canonicalTrack)
        } else {
            // new row
            rows.push({ tracks: [canonicalTrack], albumId: canonicalTrack.albumId })
        }
        lastAlbumId = canonicalTrack.albumId
    }

    return (
        <SelectedTrackId.Provider>
            <div>
                <Headings />
                {rows.map((r, i) => (
                    <AlbumRow key={i /* TODO: is index ok? */} {...r} />
                ))}
            </div>
        </SelectedTrackId.Provider>
    )
}

function Headings() {
    return (
        <Subheading>
            <Flex
                className={css`
                    height: 30px;
                `}>
                <AlbumArtistCol> Artist / Album</AlbumArtistCol>
                <TrackNumCol>#</TrackNumCol>
                <TrackCol> Track</TrackCol>
                <RatingCol> Rating</RatingCol>
                <LengthCol> Length</LengthCol>
            </Flex>
        </Subheading>
    )
}

function AlbumRow(props: { tracks: Track[]; albumId: string }) {
    const fullSizeThreshold = 9
    const album = useExplorerState(s => resolveCanonical(s.albums, props.albumId))
    const artist = useExplorerState(s =>
        resolveCanonical(s.artists, props.tracks[0].artistId /* TODO: get album primary artist */),
    )
    return (
        <Flex
            className={css`
                border-bottom: 1px solid ${colors.grey8};
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
        <DotDotDot className={css`color: ${colors.grey2}; font-size: ${fontSizes.tableSecondary};`}>
            {name}
        </DotDotDot>
    )
}

function TrackRow(props: { track: Track; album: Album; artist: Artist }) {
    const { enqueueTrack } = usePlayerDispatch()
    const { setTrackRating } = useExplorerDispatch()
    const trackId = props.track.catalogueId ?? props.track.externalId
    const selected = SelectedTrackId.useState()
    const setSelectedTrack = SelectedTrackId.useDispatch()
    // TODO: should I just use class names here?
    const TrackComponent = selected === trackId ? SelectedTrackFlex : TrackFlex
    return (
        <TrackComponent
            onMouseDown={() => setSelectedTrack(trackId)}
            onDoubleClick={() => enqueueTrack(props.track)}
            className={css``}>
            <TrackNumCol>{props.track.trackNumber}</TrackNumCol>
            <TrackCol>{props.track.title}</TrackCol>

            <RatingCol>
                <TrackRating
                    rating={props.track.rating}
                    enabled={props.track.catalogueId !== undefined}
                    onRate={r => setTrackRating(trackId, r)}
                />
            </RatingCol>
            {/* <TrackRating id={track.catalogueId} rating={track.rating} /> */}
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
        background: ${colors.grey9};
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
const TrackNumCol = styled(TableCol)`flex: 0 0 40px; text-align: right; color: ${colors.grey2};`
const TrackCol = styled(TableCol)`flex: 0 0 500px;`
const RatingCol = styled(TableCol)`flex: 0 0 100px;`
const LengthCol = styled(TableCol)`flex: 0 0 100px;`
