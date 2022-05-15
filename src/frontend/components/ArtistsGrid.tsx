import { css } from "linaria"
import React from "react"
import { useSelector } from "react-redux"
import { ArtistLink } from "../elements/links"
import { MaxLines } from "../elements/MaxLines"
import { resolveCanonical } from "../state/catalogue"
import { ArtistImage } from "./ArtistImage"

export function ArtistsGrid(props: { artistIds: string[] }) {
    return (
        <div
            className={css`
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 32px;
            `}>
            {props.artistIds.map(artistId => (
                <ArtistCell key={artistId} artistId={artistId} />
            ))}
        </div>
    )
}

function ArtistCell(props: { artistId: string }) {
    const artist = useSelector(s => resolveCanonical(s.catalogue.artists, props.artistId))
    return (
        <div>
            <ArtistLink artist={artist}>
                <ArtistImage artist={artist} />
            </ArtistLink>
            <MaxLines lines={2} className={css`line-height: 1.3; padding: 8px 0 2px; text-align: center;`}>
                <ArtistLink artist={artist} />
            </MaxLines>
        </div>
    )
}
