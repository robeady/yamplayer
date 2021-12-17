import { styled } from "linaria/lib/react"
import React from "react"
import { Link } from "react-router-dom"
import { Album, Artist } from "../../model"

export const SubtleLink = styled(Link)`
    color: inherit;
    text-decoration: inherit;
    &:hover {
        text-decoration: underline;
    }
`

export function AlbumLink(props: { className?: string; album?: Album }) {
    if (props.album === undefined) return null
    return (
        <SubtleLink
            className={props.className}
            to={`/album/${props.album.catalogueId ?? props.album.externalId}`}>
            {props.album.title}
        </SubtleLink>
    )
}

export function ArtistLink(props: { className?: string; artist?: Artist }) {
    if (props.artist === undefined) return null
    return (
        <SubtleLink
            className={props.className}
            to={`/artist/${props.artist.catalogueId ?? props.artist.externalId}`}>
            {props.artist.name}
        </SubtleLink>
    )
}
