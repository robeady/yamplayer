import { css } from "linaria"
import React from "react"
import { Album } from "../../model"
import { colors } from "../styles"

export function AlbumImage(props: { album?: Album; size?: number }) {
    return (
        <img
            className={css`border-radius: calc(5% + 1px); border: 1px solid ${colors.gray3}; display: block;`}
            src={props.album?.coverImageUrl ?? undefined}
            width={props.size}
            height={props.size}
        />
    )
}
