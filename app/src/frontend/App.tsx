import { hot } from "react-hot-loader/root"
import React, { PropsWithChildren } from "react"
import Counter from "./Counter"
import Player from "./Player"
import { TrackSearch } from "./TrackSearch"
import { Playback } from "./playback/Player"
import { NowPlaying } from "./NowPlaying"
import { Library } from "./library/library"
import theme from "./styles/theme"

const App = () => (
    <Providers>
        <div>
            <NowPlaying />
            <hr />
            <TrackSearch />
            <hr />
            <footer>
                <Counter />
                <br />
                <br />
                <Player enabled={true} />
            </footer>
        </div>
    </Providers>
)

function Providers(props: PropsWithChildren<{}>) {
    return (
        <Playback.Provider volume={0.2}>
            <Library.Provider backendUrl="http://127.0.0.1:8280">{props.children}</Library.Provider>
        </Playback.Provider>
    )
}

export default hot(App)
