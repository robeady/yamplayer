import { css } from "linaria"
import { styled } from "linaria/lib/react"
import React from "react"
import { useSelector } from "react-redux"
import { Col } from "../elements"
import { Label } from "../elements/Label"
import { AlbumLink } from "../elements/links"
import { resolveCanonical } from "../state/catalogue"
import { AlbumImage } from "./AlbumImage"

export function AlbumsRow(props: { albums: string[] }) {
    return (
        <ScrollingRow>
            {props.albums.map(albumId => (
                <AlbumsRowItem key={albumId} albumId={albumId} />
            ))}
        </ScrollingRow>
    )
}
function AlbumsRowItem(props: { albumId: string }) {
    const album = useSelector(s => resolveCanonical(s.catalogue.albums, props.albumId))
    const artist = useSelector(s => resolveCanonical(s.catalogue.artists, album?.artistId))

    return (
        <Col className={css`gap: 2px; flex: 0 0 128px; overflow: hidden; font-size: 14px;`}>
            <AlbumLink album={album}>
                <AlbumImage album={album} size={128} className={css`margin-bottom: 4px;`} />
            </AlbumLink>
            <Label lines={2}>{album?.title}</Label>
            <Label dim>{artist?.name}</Label>
        </Col>
    )
}

const ScrollingRow = styled.div`
    display: flex;
    gap: 32px;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 16px;
`
