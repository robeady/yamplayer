import { hot } from "react-hot-loader/root"
import React, { PropsWithChildren } from "react"
import Counter from "./Counter"
import Player, { NowPlaying } from "./Player"
import { TrackSearch } from "./TrackSearch"
import { Playback } from "./playback/playback"
import { Library } from "./library/library"
import { css } from "linaria"
import { AudioPlayer } from "./playback/AudioPlayer"

const App = () => (
    <Providers>
        <div
            className={css`
                height: 100vh;
                display: grid;
                grid-template-rows: minmax(0, 1fr) 120px;
            `}>
            <Main />
            <footer
                className={css`
                    border-top: 1px solid gainsboro;
                `}>
                <Player />
            </footer>
        </div>
    </Providers>
)

function Main() {
    const showNowPlaying = true
    return (
        <div
            className={css`
                display: flex;
            `}>
            <nav
                className={css`
                    width: 200px;
                    border-right: 1px solid gainsboro;
                `}>
                No nav yet, links will go here
                <br />
                <Counter />
            </nav>
            <main
                className={css`
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                `}>
                <TrackSearch />
            </main>
            {showNowPlaying && (
                <aside
                    className={css`
                        border-left: 1px solid gainsboro;
                        width: 300px;
                    `}>
                    <NowPlaying />
                </aside>
            )}
        </div>
    )
}

function Providers(props: PropsWithChildren<{}>) {
    return (
        <Playback.Provider player={new AudioPlayer(0.1)}>
            <Library.Provider backendUrl="http://127.0.0.1:8280">{props.children}</Library.Provider>
        </Playback.Provider>
    )
}

export default hot(App)
