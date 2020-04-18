import * as React from "react"
import { Playback } from "./playback/playback"

const Player = () => {
    const playing = !Playback.useState(s => s.paused)
    const volume = Playback.useState(s => s.volume)
    const { pause, play, setVolume, skipNext } = Playback.useDispatch()

    return (
        <>
            <button>Previous</button>
            <button
                onClick={() => {
                    if (playing) {
                        pause()
                    } else {
                        play()
                    }
                }}>
                Play/Pause
            </button>
            <button onClick={() => skipNext()}>Next</button>
            <span>We are {playing ? "playing" : "paused"}. Volume: </span>
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
;``
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
