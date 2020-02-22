import { makeState, Setter, Args } from "../state"

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

export const Playback = makeState((props: { volume: number }) => {
    let howl: Howl | null = null
    const initialState = {
        playingTrackTitle: "",
        paused: true,
    }
    return {
        initialState,
        actions: ({ set }: Args<typeof initialState>) => ({
            playTrack: async (trackTitle: string, trackData: Uint8Array) => {
                if (howl) {
                    howl.stop()
                }
                howl = await makeHowl(props.volume, trackData)
                howl.play()
                set({ paused: false, playingTrackTitle: trackTitle })
            },
            pause: () => {
                if (howl) {
                    howl.pause()
                }
                set(s => ({ ...s, paused: true }))
            },
        }),
    }
})
