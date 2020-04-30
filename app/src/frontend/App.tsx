import { hot } from "react-hot-loader/root"
import React, { PropsWithChildren, useRef } from "react"
import Counter from "./Counter"
import Player, { NowPlaying } from "./Player"
import { TrackSearch } from "./TrackSearch"
import { Playback } from "./playback/playback"
import { css } from "linaria"
import { AudioPlayer } from "./playback/AudioPlayer"
import { LibraryProvider } from "./library/library"

const App = () => (
    <Providers>
        <div
            className={css`
                height: 100vh;
                display: grid;
                grid-template-rows: minmax(0, 1fr) auto;
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
    // a ref has consistent identity across hot reloads
    const playerRef = useRef(new AudioPlayer(0.1))
    return (
        <Playback.Provider player={playerRef.current}>
            <LibraryProvider backendUrl="http://127.0.0.1:8280">{props.children}</LibraryProvider>
        </Playback.Provider>
    )
}

export default hot(App)
