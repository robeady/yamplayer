import { styled } from "linaria/lib/react"
import React from "react"
import { Artist } from "../../model"

export function ArtistImage(props: { className?: string; artist?: Artist; size?: number }) {
    return (
        <Img
            className={props.className}
            src={props.artist?.imageUrl}
            width={props.size ?? "100%"}
            height={props.size}
        />
    )
}

const Img = styled.img`
    border-radius: 50%;
    display: block;
    box-shadow: rgba(0, 0, 0, 0.1) 0 2px 12px;
`
