import React from "react"
import { Playback } from "./playback/Player"

export const NowPlaying = () => {
    const p = Playback.useState()
    return (
        <header>
            Playing: {p.playingTrackTitle || "nothing right now"}
            <br />
            Paused? {p.paused.toString()}
        </header>
    )
}
