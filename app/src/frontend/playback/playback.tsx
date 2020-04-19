import { useState, useMemo, useEffect } from "react"
import { createState, immerise } from "../state"
import { AudioPlayer } from "./AudioPlayer"

type TrackBuffer = Uint8Array

export type PlaybackStatus =
    | { state: "stopped" }
    | { state: "paused"; atPosition: number }
    | { state: "playing"; sinceTimestamp: number; positionAtTimestamp: number }

function usePlayerState(props: { player: AudioPlayer }) {
    const [state, setState] = useState({
        status: { state: "stopped" } as PlaybackStatus,
        volume: props.player.volume,
        queue: [] as { id: string; title: string; buffer: TrackBuffer }[],
    })
    const update = useMemo(() => immerise(setState), [])
    useEffect(() => {
        const subId = props.player.subscribe(() =>
            update(s => {
                s.queue.shift()
                if (s.queue.length === 0) {
                    s.status = { state: "stopped" }
                }
            }),
        )
        return () => props.player.unsubscribe(subId)
    }, [props.player, update])
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
                const timestamp = Date.now() / 1000
                update(s => {
                    s.queue.push({ id, title, buffer: trackData })
                    if (s.status.state === "stopped") {
                        s.status = { state: "playing", sinceTimestamp: timestamp, positionAtTimestamp: 0 }
                    }
                })
            },
            pause: () => {
                const position = props.player.pause()
                if (position !== null) {
                    update(s => (s.status = { state: "paused", atPosition: position }))
                }
            },
            unpause: () => {
                const position = props.player.unpause()
                if (position !== null) {
                    const timestamp = Date.now() / 1000
                    update(
                        s =>
                            (s.status = { state: "playing", sinceTimestamp: timestamp, positionAtTimestamp: position }),
                    )
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
