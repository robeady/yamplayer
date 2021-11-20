import { css } from "linaria"
import React from "react"
import { Album } from "../../model"

export function AlbumImage(props: { album: Album; size: number }) {
    return (
        <img
            className={css`border-radius: calc(5% + 1px);`}
            src={props.album.coverImageUrl ?? undefined}
            width={props.size}
            height={props.size}
        />
    )
}
