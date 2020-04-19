import * as React from "react"
import { Playback } from "./playback/playback"

const Player = () => {
    const status = Playback.useState(s => s.status)
    const volume = Playback.useState(s => s.volume)
    const { setVolume, skipNext } = Playback.useDispatch()

    return (
        <>
            <button>Previous</button>
            <PlayPauseButton />
            <button onClick={() => skipNext()}>Next</button>
            <span>We are {status.state}. Volume: </span>
            <input
                type="number"
                value={volume}
                step={0.01}
                min={0}
                max={1}
                onChange={e => setVolume(parseFloat(e.target.value))}
            />
            <NowPlaying />
        </>
    )
}

function PlayPauseButton() {
    const status = Playback.useState(s => s.status)
    const { pause, unpause } = Playback.useDispatch()
    if (status.state === "stopped") {
        return <button disabled>Stopped</button>
    } else if (status.state === "paused") {
        return <button onClick={unpause}>Play</button>
    } else {
        return <button onClick={pause}>Pause</button>
    }
}

function NowPlaying() {
    const queue = Playback.useState(s => s.queue)
    return (
        <>
            <br />
            <span>Now playing:</span>
            <ol>
                {queue.map(item => (
                    <li>{item.title}</li>
                ))}
            </ol>
        </>
    )
}

export default Player
