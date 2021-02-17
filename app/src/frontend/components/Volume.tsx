import { css } from "linaria"
import React from "react"
import { useDispatch, useSelector } from "react-redux"
import VolumeDown from "../icons/volume_down.svg"
import VolumeMute from "../icons/volume_mute.svg"
import VolumeOff from "../icons/volume_off.svg"
import VolumeUp from "../icons/volume_up.svg"
import { audio } from "../state/actions"
import { Slider } from "./Slider"

export function VolumeControl() {
    const volume = useSelector(s => s.player.volume)
    const muted = useSelector(s => s.player.muted)
    const dispatch = useDispatch()
    const VolumeIcon = muted ? VolumeOff : volume < 0.1 ? VolumeMute : volume < 0.5 ? VolumeDown : VolumeUp
    return (
        <div
            className={css`
                display: flex;
                align-items: center;
            `}>
            <VolumeIcon fill="slategray" onClick={() => dispatch(audio.toggleMute())} />
            <div
                className={css`
                    width: 100px;
                `}>
                <Slider value={volume} onChange={v => dispatch(audio.setVolume(v))} />
            </div>
        </div>
    )
}
