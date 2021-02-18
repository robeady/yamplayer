import { css } from "linaria"
import React from "react"
import { MdVolumeDown, MdVolumeMute, MdVolumeOff, MdVolumeUp } from "react-icons/md"
import { useDispatch, useSelector } from "react-redux"
import { audio } from "../state/actions"
import { colors } from "../styles"
import { Slider } from "./Slider"

export function VolumeControl() {
    const volume = useSelector(s => s.player.volume)
    const muted = useSelector(s => s.player.muted)
    const dispatch = useDispatch()
    const VolumeIcon = muted
        ? MdVolumeOff
        : volume < 0.1
        ? MdVolumeMute
        : volume < 0.5
        ? MdVolumeDown
        : MdVolumeUp
    return (
        <div
            className={css`
                display: flex;
                align-items: center;
            `}>
            <VolumeIcon
                className={css`
                    color: ${colors.gray5};
                    &:hover {
                        color: ${colors.gray7};
                    }
                `}
                size={24}
                onClick={() => dispatch(audio.toggleMute())}
            />
            <div
                className={css`
                    width: 100px;
                `}>
                <Slider value={volume} onChange={v => dispatch(audio.setVolume(v))} />
            </div>
        </div>
    )
}
