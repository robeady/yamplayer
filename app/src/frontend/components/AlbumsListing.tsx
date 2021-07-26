import { css } from "linaria"
import { styled } from "linaria/lib/react"
import React, { useMemo } from "react"
import { useSelector } from "react-redux"
import { Album, Artist, Track } from "../../model"
import { Dict } from "../../util/types"
import { Col, DotDotDot, Flex, Row, Subheading } from "../elements"
import { useDropdownMenu } from "../elements/DropdownMenu"
import { SubtleLink } from "../elements/SubtleLink"
import { resolveCanonical } from "../state/catalogue"
import { AudioQueue, buildAudioQueue } from "../state/queue"
import { colors, fontSizes } from "../styles"
import { AlbumImage } from "./AlbumImage"
import { TrackTable, TrackTableColumn, TrackTableHeader } from "./AlbumTrackTable"

interface AlbumRowData {
    tracks: Track[]
    albumId: string
}

function assembleRows(trackIds: string[], allTracks: Dict<string | Track>) {
    let lastAlbumId = ""
    const rows: AlbumRowData[] = []
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

const tableCols: TrackTableColumn[] = ["#", "title", "rating", "duration"]

/** This component shows a table of tracks, but where consecutive tracks from the same album are grouped together. */
export function AlbumsListing(props: { trackIds: string[] }) {
    // let's fetch all those tracks, because we'll need to iterate over them to find which ones have the same album
    const allTracks = useSelector(s => s.catalogue.tracks)
    const rows = useMemo(() => assembleRows(props.trackIds, allTracks), [allTracks, props.trackIds])
    return (
        <div>
            <Row>
                <Subheading>
                    <Row className={css`height: 30px;`}>
                        <AlbumArtistCol>Artist / Album</AlbumArtistCol>
                    </Row>
                </Subheading>
                <TrackTableHeader cols={tableCols} />
            </Row>

            {rows.map(({ tracks, albumId }, i) => (
                <AlbumRow
                    key={
                        i.toString() /* same album could appear more than once so cannot just use album id */
                    }
                    tracks={tracks}
                    albumId={albumId}
                    buildTrackQueue={tid =>
                        buildAudioQueue(
                            rows.flatMap(r => r.tracks).map(t => t.catalogueId ?? t.externalId),
                            tid,
                        )
                    }
                />
            ))}
        </div>
    )
}

function AlbumRow(props: {
    tracks: Track[]
    albumId: string
    buildTrackQueue: (fromTrackId: string) => AudioQueue
}) {
    const fullSizeThreshold = 9
    const album = useSelector(s => resolveCanonical(s.catalogue.albums, props.albumId))
    const artist = useSelector(s =>
        resolveCanonical(s.catalogue.artists, props.tracks[0]!.artistId /* TODO: get album primary artist */),
    )
    const { show } = useDropdownMenu()

    return (
        <Flex
            className={css`
                border-bottom: 1px solid ${colors.gray2};
                font-size: ${fontSizes.tableContent};
            `}
            onContextMenu={show}>
            {props.tracks.length >= fullSizeThreshold ? (
                <FullSizeAlbumCell album={album} artist={artist} />
            ) : (
                <SmallAlbumCell album={album} artist={artist} />
            )}
            <TrackTable tracks={props.tracks} cols={tableCols} buildTrackQueue={props.buildTrackQueue} />
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
            <AlbumImage album={props.album} size={230} />
            <Col>
                <AlbumTitle album={props.album} />
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
            <AlbumImage album={props.album} size={36} />
            <Col
                className={css`
                    overflow: hidden;
                    margin-top: -1px; // shift up
                    line-height: 1.4;
                `}>
                <AlbumTitle album={props.album} />
                <ArtistName name={props.artist.name} />
            </Col>
        </AlbumArtistCol>
    )
}

function AlbumTitle(props: { album: Album }) {
    return (
        <SubtleLink to={`/library/album/${props.album.catalogueId}`}>
            {" "}
            <DotDotDot className={css``}>{props.album.title}</DotDotDot>
        </SubtleLink>
    )
}

function ArtistName({ name = "" }) {
    return (
        <DotDotDot className={css`color: ${colors.gray6}; font-size: ${fontSizes.tableSecondary};`}>
            {name}
        </DotDotDot>
    )
}

const AlbumArtistCol = styled.div`flex: 0 0 274px; padding-right: 20px;`
