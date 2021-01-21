import { css, cx } from "linaria"
import React from "react"
import { Album, Artist, Track } from "../../model"
import { Flex, FlexCol } from "../elements"
import { formatTime } from "../formatting"
import { resolveCanonical, useExplorerState } from "../library/library"

/** This component shows a table of tracks, but where consecutive tracks from the same album are grouped together. */
export function PlaylistView(props: { trackIds: string[] }) {
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
        <div>
            <Headings />
            {rows.map((r, i) => (
                <AlbumRow key={i} /* TODO: is index ok? */ {...r} />
            ))}
        </div>
    )
}

function Headings() {
    return (
        <Flex className={css`text-transform: uppercase; font-size: 13px; color: #888; height: 30px;`}>
            <div className={albumArtistCol}>Artist and Album</div>
            <div className={trackCol}>Track</div>
            {/* <div>Rating</div> */}
            <div className={lengthCol}>Length</div>
        </Flex>
    )
}

function AlbumRow(props: { tracks: Track[]; albumId: string }) {
    const fullSizeThreshold = 6
    const album = useExplorerState(s => resolveCanonical(s.albums, props.albumId))
    const artist = useExplorerState(s =>
        resolveCanonical(s.artists, props.tracks[0].artistId /* TODO: get album primary artist */),
    )
    return (
        <Flex className={css`border-bottom: 1px solid #e6e6e6; font-size: 15px;`}>
            {props.tracks.length > fullSizeThreshold ? (
                <FullSizeAlbumCell album={album} artist={artist} />
            ) : (
                <SmallAlbumCell album={album} artist={artist} />
            )}
            <FlexCol className={css`width: 100%;`}>
                {props.tracks.map(track => (
                    <TrackRow
                        key={track.catalogueId ?? track.externalId}
                        track={track}
                        album={album}
                        artist={artist}
                    />
                ))}
            </FlexCol>
        </Flex>
    )
}

function FullSizeAlbumCell(props: { album: Album; artist: Artist }) {
    return (
        <FlexCol className={cx(css`gap: 8px; padding: 6px; overflow: hidden;`, albumArtistCol)}>
            <img src={props.album.coverImageUrl ?? undefined} width={256} height={256} />
            <FlexCol>
                <AlbumTitle title={props.album.title} />
                <ArtistName name={props.artist.name} />
            </FlexCol>
        </FlexCol>
    )
}

function SmallAlbumCell(props: { album: Album; artist: Artist }) {
    return (
        <Flex
            className={cx(
                css`
                    gap: 8px;
                    padding: 6px;
                    height: ${rowHeight};
                    align-items: center;
                    overflow: hidden;
                `,
                albumArtistCol,
            )}>
            <img src={props.album.coverImageUrl ?? undefined} width={32} height={32} />
            <FlexCol className={css`overflow: hidden;`}>
                <AlbumTitle title={props.album.title} />
                <ArtistName name={props.artist.name} />
            </FlexCol>
        </Flex>
    )
}

function AlbumTitle({ title = "" }) {
    return <div className={css`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`}>{title}</div>
}

function ArtistName({ name = "" }) {
    return (
        <div
            className={css`
                color: #555;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 90%;
            `}>
            {name}
        </div>
    )
}

function TrackRow(props: { track: Track; album: Album; artist: Artist }) {
    return (
        <Flex
            className={css`
                height: ${rowHeight};
                align-items: center;
                border-bottom: 1px solid #e6e6e6;
                padding: 6px;
                &:last-child {
                    border-bottom: 0;
                }
            `}>
            <div className={trackCol}>{props.track.title}</div>
            {/* <TrackRating id={track.catalogueId} rating={track.rating} /> */}
            <TrackLength className={lengthCol} durationSecs={props.track.durationSecs} />
        </Flex>
    )
}

const rowHeight = "32px"

function TrackLength(props: { durationSecs: number; className: string }) {
    return <div className={props.className}>{formatTime(props.durationSecs)}</div>
}

const albumArtistCol = css`flex: 0 0 264px;`
const trackCol = css`flex: 0 0 500px;`
const lengthCol = css`flex: 0 0 100px;`
