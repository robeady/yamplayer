import React, { useState } from "react"
import { stateContext, stateContextButHooky } from "../state"

const makeHowl = async (volume: number, buffer: Uint8Array) => {
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

interface PlaybackState {
    playingTrackTitle: string
    paused: boolean
}

const { Provider, useContextValue } = stateContext<PlaybackState>()

export const usePlayback = useContextValue

export class PlaybackProvider extends React.Component<{ volume: number }, PlaybackState> {
    private howl: Howl | null = null

    readonly state: PlaybackState = {
        playingTrackTitle: "",
        paused: true,
    }

    actions = {
        playTrack: async (trackTitle: string, trackData: Uint8Array) => {
            if (this.howl) {
                this.howl.stop()
            }
            this.howl = await makeHowl(this.props.volume, trackData)
            this.howl.play()
            this.setState({ paused: false, playingTrackTitle: trackTitle })
        },
        pause: () => {
            if (this.howl) {
                this.howl.pause()
            }
            this.setState({ paused: true })
        },
    }

    render() {
        return <Provider value={{ ...this.state, ...this.actions }}>{this.props.children}</Provider>
    }
}

//
//
//
//
// THE OLD ONE
//
//
//

function usePlayerHookyStuff(props: { volume: number }) {
    let howl: Howl | null = null
    const [state, setState] = useState({
        playingTrackTitle: "",
        paused: true,
    })
    return {
        ...state,
        actions: {
            playTrack: async (trackTitle: string, trackData: Uint8Array) => {
                if (howl) {
                    howl.stop()
                }
                howl = await makeHowl(props.volume, trackData)
                howl.play()
                setState({ paused: false, playingTrackTitle: trackTitle })
            },
            pause: () => {
                if (howl) {
                    howl.pause()
                }
                setState(s => ({ ...s, paused: true }))
            },
        },
    }
}

export const Playback = stateContextButHooky(usePlayerHookyStuff)
