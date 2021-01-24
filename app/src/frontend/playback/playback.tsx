import { useEffect, useMemo, useState } from "react"
import { Explorer } from "../../backend/explorer"
import { Remote } from "../../backend/rpc/client"
import { Track } from "../../model"
import { defaultDecoder } from "../../services"
import { useExplorerDispatch } from "../library/library"
import { createState, immerise } from "../state"
import { AudioPlayer } from "./AudioPlayer"

type TrackBuffer = Uint8Array

export type PlaybackStatus =
    | { state: "stopped" }
    | { state: "paused"; atPosition: number }
    | { state: "playing"; sinceTimestampMillis: number; positionAtTimestamp: number }

export interface QueueEntry {
    trackId: string
    buffer: TrackBuffer
}

async function loadTrackData(explorerClient: Remote<Explorer>, track: Track) {
    const url = await explorerClient.resolveTrackUrl(track.externalId)
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const array = new Uint8Array(buffer)
    defaultDecoder.decodeTrackInPlace(track.externalId, array)
    return array
}

function usePlayerStateInternal(props: { player: AudioPlayer }) {
    const { explorerClient } = useExplorerDispatch()
    const [state, setState] = useState({
        status: { state: "stopped" } as PlaybackStatus,
        volume: props.player.volume(),
        muted: false,
        queue: [] as QueueEntry[],
    })
    const update = useMemo(() => immerise(setState), [])
    useEffect(() => {
        const subId = props.player.subscribe(() => {
            const timestamp = performance.now()
            update(s => {
                s.queue.shift()
                if (s.queue.length === 0) {
                    s.status = { state: "stopped" }
                } else {
                    s.status = { state: "playing", sinceTimestampMillis: timestamp, positionAtTimestamp: 0 }
                }
            })
        })
        return () => props.player.unsubscribe(subId)
    }, [props.player, update])
    const actions = useMemo(
        () => ({
            enqueueTrack: async (track: Track) => {
                const trackData: TrackBuffer = await loadTrackData(explorerClient, track)
                props.player.enqueue(trackData)
                const timestamp = performance.now()
                update(s => {
                    s.queue.push({ trackId: track.catalogueId ?? track.externalId, buffer: trackData })
                    if (s.status.state === "stopped") {
                        s.status = {
                            state: "playing",
                            sinceTimestampMillis: timestamp,
                            positionAtTimestamp: 0,
                        }
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
                    const timestamp = performance.now()
                    update(
                        s =>
                            (s.status = {
                                state: "playing",
                                sinceTimestampMillis: timestamp,
                                positionAtTimestamp: position,
                            }),
                    )
                }
            },
            skipNext: () => {
                props.player.skipNext()
                const timestamp = performance.now()
                update(s => {
                    s.queue.shift()
                    if (s.queue.length === 0) {
                        s.status = { state: "stopped" }
                    } else {
                        s.status = {
                            state: "playing",
                            sinceTimestampMillis: timestamp,
                            positionAtTimestamp: 0,
                        }
                    }
                })
            },
            setVolume: (volume: number) => {
                props.player.setVolume(volume)
                update(s => (s.volume = volume))
            },
            toggleMute: () => {
                props.player.toggleMute()
                update(s => (s.muted = !s.muted))
            },
        }),
        [update, props.player, explorerClient],
    )
    return [state, actions] as const
}

export const {
    useState: usePlayerState,
    useDispatch: usePlayerDispatch,
    Provider: PlaybackProvider,
} = createState(usePlayerStateInternal)
