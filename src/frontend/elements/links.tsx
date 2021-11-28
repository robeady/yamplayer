import { styled } from "linaria/lib/react"
import React from "react"
import { Link } from "react-router-dom"
import { Album } from "../../model"

export const SubtleLink = styled(Link)`
    color: inherit;
    text-decoration: inherit;
    &:hover {
        text-decoration: underline;
    }
`

export function AlbumLink(props: { album?: Album }) {
    if (props.album === undefined) return null
    return (
        <SubtleLink to={`/album/${props.album.catalogueId ?? props.album.externalId}`}>
            {props.album.title}
        </SubtleLink>
    )
}
