import React from "react"
import PlayArrow from "../icons/play_arrow.svg"
import Pause from "../icons/pause.svg"
import { css } from "linaria"

export function PlayPauseButton(props: {
    icon: "play" | "pause"
    disabled?: boolean // TODO use this
    size: number
    onClick?: () => void
}) {
    const icon =
        props.icon === "play" ? (
            <PlayArrow width={props.size} height={props.size} />
        ) : (
            <Pause width={props.size} height={props.size} />
        )
    return (
        <div
            className={css`
                background: hsl(270, 80%, 60%);
                border-radius: 50%;
                cursor: pointer;
                padding: 6px;
                fill: white;
                line-height: 0;
                &:hover {
                    background: hsl(270, 80%, 50%);
                }
            `}
            onClick={props.onClick}>
            {icon}
        </div>
    )
}
