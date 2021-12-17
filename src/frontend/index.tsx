import "core-js/stable"
import * as React from "react"
import { render } from "react-dom"
import { Provider } from "react-redux"
import { Explorer } from "../backend/explorer"
import { remote, Remote } from "../backend/rpc/client"
import { Track } from "../model"
import { defaultDecoder } from "../services"
import App from "./App"
import { AudioPlayer } from "./state/AudioPlayer"
import { resolveCanonical } from "./state/catalogue"
import { createStore } from "./state/redux"

// these must not be reordered.
// until https://github.com/microsoft/TypeScript/issues/41494 we need to use require
/* eslint-disable @typescript-eslint/no-require-imports */
require("sanitize.css/evergreen.css")
require("sanitize.css/forms.evergreen.css")
require("sanitize.css/assets.css")
require("sanitize.css/typography.css")
require("./styles/global")
/* eslint-enable @typescript-eslint/no-require-imports */

async function loadTrackData(explorerClient: Remote<Explorer>, track: Track) {
    const query = new URLSearchParams({ url: await explorerClient.resolveTrackUrl(track.externalId) })
    const response = await fetch(`/api/proxy?${query}`)
    const buffer = await response.arrayBuffer()
    const array = new Uint8Array(buffer)
    defaultDecoder.decodeTrackInPlace(track.externalId, array)
    return array
}

function setupStore() {
    const backendUrl = "api"
    const explorer = remote<Explorer>(`${backendUrl}/explorer`)
    // eslint bug: it doesn't recognise this tying-the-knot pattern
    let audioPlayer: AudioPlayer // eslint-disable-line prefer-const
    const store = createStore({
        explorer,
        get audio() {
            return audioPlayer
        },
    })
    audioPlayer = new AudioPlayer(
        0.2,
        async trackId => {
            const track = resolveCanonical(store.getState().catalogue.tracks, trackId)
            if (track) {
                return loadTrackData(explorer, track)
            } else {
                throw new Error(`cannot load unknown track ${trackId}`)
            }
        },
        store.dispatch,
    )
    return store
}

const store = setupStore()

render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById("app"),
)
