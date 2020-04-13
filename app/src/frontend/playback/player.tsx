import { useState, useRef, useMemo } from "react"
import { createState } from "../state"
import { Howl } from "howler"

const makeHowl = (volume: number, buffer: Uint8Array) => {
    const blob = new Blob([buffer])
    const url = URL.createObjectURL(blob)
    const howl = new Howl({
        src: url,
        format: "flac",
        volume: volume,
        onloaderror: (id, e) => console.error(e),
        onplayerror: (id, e) => console.error(e),
    })
    return howl
}

function usePlayerState(props: { volume: number }) {
    const howl = useRef(null as Howl | null)
    const [state, setState] = useState({
        playingTrackTitle: "",
        paused: true,
    })
    const actions = useMemo(
        () => ({
            playTrack: (trackTitle: string, trackData: Uint8Array) => {
                howl.current?.stop()
                howl.current = makeHowl(props.volume, trackData)
                howl.current.play()
                setState({ paused: false, playingTrackTitle: trackTitle })
            },
            pause: () => {
                if (howl.current) {
                    howl.current.pause()
                    setState(s => ({ ...s, paused: true }))
                }
            },
            play: () => {
                if (howl.current) {
                    howl.current.play()
                    setState(s => ({ ...s, paused: false }))
                }
            },
        }),
        [props.volume],
    )
    return [state, actions] as const
}

export const Playback = createState(usePlayerState)
