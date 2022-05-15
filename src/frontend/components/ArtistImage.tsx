import { styled } from "linaria/lib/react"
import React from "react"
import { Artist } from "../../model"

export function ArtistImage(props: { className?: string; artist?: Artist; size?: number }) {
    return (
        <Img
            className={props.className}
            src={props.artist?.imageUrl}
            width={props.size}
            height={props.size}
        />
    )
}

const Img = styled.img`
    border-radius: 50%;
    display: block;
`
