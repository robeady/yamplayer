import { styled } from "linaria/lib/react"
import React from "react"
import { Album } from "../../model"
import { colors } from "../styles"

export function AlbumImage(props: { className?: string; album?: Album; size?: number }) {
    return (
        <Img
            className={props.className}
            src={props.album?.coverImageUrl}
            width={props.size}
            height={props.size}
        />
    )
}

const Img = styled.img`
    border-radius: calc(4% + 2px);
    border: 1px solid ${colors.gray3};
    display: block;
`
