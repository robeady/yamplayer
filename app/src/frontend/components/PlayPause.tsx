import { css } from "linaria"
import React from "react"
import Pause from "../icons/pause.svg"
import PlayArrow from "../icons/play_arrow.svg"
import { colors } from "../styles"

export function PlayPauseButton(props: { icon: "play" | "pause"; size: number; onClick?: () => void }) {
    const icon =
        props.icon === "play" ? (
            <PlayArrow width={props.size} height={props.size} />
        ) : (
            <Pause width={props.size} height={props.size} />
        )
    return (
        <div
            className={css`
                background: ${colors.purple5};
                border-radius: 50%;
                cursor: pointer;
                padding: 6px;
                color: white;
                line-height: 0;
                &:hover {
                    background: ${colors.purple4};
                }
            `}
            onClick={props.onClick}>
            {icon}
        </div>
    )
}
