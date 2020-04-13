import * as React from "react"
import { Playback } from "./playback/Player"

// const mainProcessAxios = Electron.remote.getGlobal("axios") as typeof import("axios")["default"]

// BELOW: old test code for downloading a song

// const searchAndDownloadFromGateway = async (query: string) => {
//     const client = remote<DeezerApiClient>("http://127.0.0.1:8280/deezer")
//     const tracks = await client.searchTracks(query)
//     const deezerId = tracks[0].track.externalId
//     const url = await client.getTrackUrl(deezerId)
//     const response = await fetch(url)
//     const buffer = await response.arrayBuffer()
//     const sngId = deezerId.split(":")[1]
//     return new DeezerCodec().decodeTrack(new Uint8Array(buffer), sngId)
// }

// const makeHowl = (buffer: Uint8Array) => {
//     const blob = new Blob([buffer])
//     const url = URL.createObjectURL(blob)
//     const howl = new Howl({
//         src: url,
//         format: "flac",
//         volume: 0.3,
//         onloaderror: (id, e) => console.error(e),
//         onplayerror: (id, e) => console.error(e),
//     })
//     return howl
// }

const Player = (props: { enabled: boolean }) => {
    const playing = !Playback.useState(s => s.paused)
    const { pause, play } = Playback.useDispatch()
    // const [playHandle, setPlayhandle] = useState(null as number | null)
    // const [playing, setPlaying] = useState(false)
    // useEffect(() => {
    //     searchAndDownloadFromGateway("give life back to music")
    //         // downloadSong()
    //         .then(makeHowl)
    //         .then(setHowl)
    // }, [])

    return (
        <>
            We are {playing ? "playing" : "paused"}.<br />
            <button
                disabled={!props.enabled}
                onClick={() => {
                    if (playing) {
                        pause()
                    } else {
                        play()
                    }
                }}>
                play-pause
            </button>
        </>
    )
}

export default Player
