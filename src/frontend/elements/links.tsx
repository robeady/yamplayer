import { styled } from "linaria/lib/react"
import React, { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Album, Artist } from "../../model"

export const SubtleLink = styled(Link)`
    color: inherit;
    text-decoration: inherit;
    &:hover {
        text-decoration: underline;
    }
`
/** If children are provided, surrounds with a link to the album page. Otherwise inserts a text link. */
export function AlbumLink(props: { className?: string; album?: Album; children?: ReactNode }) {
    if (props.album === undefined) return null
    const LinkComponent = props.children ? Link : SubtleLink
    return (
        <LinkComponent className={props.className} to={`/album/${props.album.id}`}>
            {props.children ?? props.album.title}
        </LinkComponent>
    )
}

/** If children are provided, surrounds with a link to the artist page. Otherwise inserts a text link. */
export function ArtistLink(props: { className?: string; artist?: Artist; children?: ReactNode }) {
    if (props.artist === undefined) return null
    const LinkComponent = props.children ? Link : SubtleLink
    return (
        <LinkComponent className={props.className} to={`/artist/${props.artist.id}`}>
            {props.children ?? props.artist.name}
        </LinkComponent>
    )
}
