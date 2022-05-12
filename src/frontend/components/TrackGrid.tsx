import { css } from "linaria"
import { styled } from "linaria/lib/react"
import React from "react"
import { useSelector } from "react-redux"
import { DotDotDot, Row } from "../elements"
import { resolveCanonical } from "../state/catalogue"
import { colors } from "../styles"
import { AlbumImage } from "./AlbumImage"

export function TrackGrid(props: { tracks: string[] }) {
    return (
        <ColGrid>
            {props.tracks.map(t => (
                <TrackGridCell key={t} track={t} />
            ))}
        </ColGrid>
    )
}
function TrackGridCell(props: { track: string }) {
    const track = useSelector(s => resolveCanonical(s.catalogue.tracks, props.track))
    const album = useSelector(s => resolveCanonical(s.catalogue.albums, track?.albumId))
    const artist = useSelector(s => resolveCanonical(s.catalogue.artists, track?.artistIds[0]))
    return (
        <Row className={css`gap: 8px;`}>
            <AlbumImage album={album} size={48} />
            <div className={css`width: 220px; font-size: 14px; overflow: hidden;`}>
                <DotDotDot>{track?.title}</DotDotDot>
                <DotDotDot className={css`color: ${colors.gray6};`}>{artist?.name}</DotDotDot>
            </div>
        </Row>
    )
}

const ColGrid = styled.div`
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(3, 1fr);
    gap: 12px;
    width: 100%;
    overflow-x: scroll;
    padding-bottom: 16px;
`
