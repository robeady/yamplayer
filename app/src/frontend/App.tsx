import { hot } from "react-hot-loader/root"
import React from "react"
import Counter from "./Counter"
import Player from "./Player"
import { TrackSearch } from "./TrackSearch"
import { Playback } from "./playback/Player"
import { NowPlaying } from "./NowPlaying"
import { Library } from "./library/library"

const App = () => (
    <div>
        <Playback.Provider volume={0.2}>
            <NowPlaying />
            <hr />
            <Library.Provider backendUrl="http://127.0.0.1:8280">
                <TrackSearch />
            </Library.Provider>
        </Playback.Provider>
        <hr />
        <footer>
            <Counter />
            <br />
            <br />
            <Player enabled={true} />
        </footer>
    </div>
)

export default hot(App)
