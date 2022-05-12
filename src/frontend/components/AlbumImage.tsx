import { css, cx } from "linaria"
import React from "react"
import { Album } from "../../model"
import { colors } from "../styles"

export function AlbumImage(props: { className: string; album?: Album; size?: number }) {
    return (
        <img
            className={cx(
                props.className,
                css`
                    border-radius: calc(4% + 2px);
                    border: 1px solid ${colors.gray3};
                    display: block;
                `,
            )}
            src={props.album?.coverImageUrl ?? undefined}
            width={props.size}
            height={props.size}
        />
    )
}
