import React from "react"
import { Pause, Play } from "react-zondicons"
import { css } from "linaria"

export function PlayPauseButton(props: {
    icon: "play" | "pause"
    disabled?: boolean // TODO use this
    size: number
    onClick?: () => void
}) {
    const icon =
        props.icon === "play" ? (
            <Play
                className={css`
                    margin: 0 -2px 0 2px;
                `}
                size={props.size}
            />
        ) : (
            <Pause size={props.size} />
        )
    return (
        <div
            className={css`
                background: hsl(270, 80%, 60%);
                border-radius: 50%;
                cursor: pointer;
                padding: 8px;
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
