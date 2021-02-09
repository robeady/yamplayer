import { css } from "linaria"
import React from "react"
import VolumeDown from "../icons/volume_down.svg"
import VolumeMute from "../icons/volume_mute.svg"
import VolumeOff from "../icons/volume_off.svg"
import VolumeUp from "../icons/volume_up.svg"
import { usePlayerDispatch, usePlayerState } from "../state/playback"
import { Slider } from "./Slider"

export function VolumeControl() {
    const volume = usePlayerState(s => s.volume)
    const muted = usePlayerState(s => s.muted)
    const { setVolume, toggleMute } = usePlayerDispatch()

    const VolumeIcon = muted ? VolumeOff : volume < 0.1 ? VolumeMute : volume < 0.5 ? VolumeDown : VolumeUp

    return (
        <div
            className={css`
                display: flex;
                align-items: center;
            `}>
            <VolumeIcon fill="slategray" onClick={toggleMute} />
            <div
                className={css`
                    width: 100px;
                `}>
                <Slider value={volume} onChange={v => setVolume(v)} />
            </div>
        </div>
    )
}
