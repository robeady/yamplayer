import { css } from "linaria"
import React from "react"
import { useSelector } from "react-redux"
import { Link } from "react-router-dom"
import { AlbumLink, ArtistLink } from "../elements/links"
import { MaxLines } from "../elements/MaxLines"
import { resolveCanonical } from "../state/catalogue"
import { colors } from "../styles"
import { AlbumImage } from "./AlbumImage"

export function AlbumsGrid(props: { albumIds: string[] }) {
    return (
        <div
            className={css`
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 32px;
            `}>
            {props.albumIds.map(albumId => (
                <AlbumCell key={albumId} albumId={albumId} />
            ))}
        </div>
    )
}

function AlbumCell(props: { albumId: string }) {
    const album = useSelector(s => resolveCanonical(s.catalogue.albums, props.albumId))
    const artist = useSelector(s => resolveCanonical(s.catalogue.artists, album?.artistId))
    return (
        <div>
            <Link to={`/album/${props.albumId}`}>
                <AlbumImage album={album} />
            </Link>
            <MaxLines lines={2} className={css`line-height: 1.3; padding: 8px 0 2px;`}>
                <AlbumLink album={album} />
            </MaxLines>
            <MaxLines lines={2} className={css`line-height: 1.3; font-size: 14px; color: ${colors.gray6};`}>
                <ArtistLink artist={artist} />
            </MaxLines>
        </div>
    )
}
