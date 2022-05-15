import { css } from "linaria"
import React from "react"
import { useSelector } from "react-redux"
import { Label } from "../elements/Label"
import { ArtistLink } from "../elements/links"
import { MaxLines } from "../elements/MaxLines"
import { plural } from "../elements/plural"
import { resolveCanonical } from "../state/catalogue"
import { ArtistImage } from "./ArtistImage"

export interface ArtistDetails {
    albumIds: Set<string>
    trackIds: Set<string>
}

export function ArtistsGrid(props: { artists: [string, ArtistDetails][] }) {
    return (
        <div
            className={css`
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 32px;
            `}>
            {props.artists.map(([artistId, artistDetails]) => (
                <ArtistCell key={artistId} artistId={artistId} artistDetails={artistDetails} />
            ))}
        </div>
    )
}

function ArtistCell(props: { artistId: string; artistDetails: ArtistDetails }) {
    const { trackIds, albumIds } = props.artistDetails
    const artist = useSelector(s => resolveCanonical(s.catalogue.artists, props.artistId))
    return (
        <div className={css`text-align: center;`}>
            <ArtistLink artist={artist}>
                <ArtistImage artist={artist} />
            </ArtistLink>
            <MaxLines lines={2} className={css`line-height: 1.3; padding: 8px 0 2px;`}>
                <ArtistLink artist={artist} />
            </MaxLines>
            <Label dim>
                {plural(trackIds.size, "track")}
                {trackIds.size > 1 && ", " + plural(albumIds.size, "album")}
            </Label>
        </div>
    )
}
