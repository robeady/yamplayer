import { useState, useMemo, useEffect } from "react"
import { createState, immerise } from "../state"
import { AudioPlayer } from "./AudioPlayer"

type TrackBuffer = Uint8Array

function usePlayerState(props: { player: AudioPlayer }) {
    useEffect(() => {
        // subscribe to player events
        return () => {
            // unsubscribe from player events
        }
    }, [])
    const [state, setState] = useState({
        paused: false,
        volume: props.player.volume,
        queue: [] as { id: string; title: string; buffer: TrackBuffer }[],
    })
    const update = immerise(setState)
    const actions = useMemo(
        () => ({
            // playTrack: (trackTitle: string, trackData: TrackBuffer) => {
            //     props.player.play(trackData)
            //     update(s => {
            //         s.paused = false
            //     })
            // },
            enqueueTrack: (id: string, title: string, trackData: TrackBuffer) => {
                props.player.enqueue(trackData)
                update(s => s.queue.push({ id, title, buffer: trackData }))
            },
            pause: () => {
                if (props.player.pause()) {
                    update(s => (s.paused = true))
                }
            },
            play: () => {
                if (props.player.unpause()) {
                    update(s => (s.paused = false))
                }
            },
            skipNext: () => {
                props.player.skipNext()
                update(s => s.queue.shift())
            },
            setVolume: (volume: number) => {
                props.player.setVolume(volume)
                update(s => (s.volume = volume))
            },
        }),
        [update, props.player],
    )
    return [state, actions] as const
}

export const Playback = createState(usePlayerState)
