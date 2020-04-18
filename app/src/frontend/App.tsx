import { hot } from "react-hot-loader/root"
import React, { PropsWithChildren } from "react"
import Counter from "./Counter"
import Player from "./Player"
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
                grid-template-areas:
                    "leftNav main"
                    "player player";
                grid-template-columns: 200px auto;
                grid-template-rows: auto 100px;
            `}>
            <main
                className={css`
                    grid-area: main;
                    overflow-y: scroll;
                `}>
                <TrackSearch />
            </main>
            <nav
                className={css`
                    grid-area: leftNav;
                    border-right: 1px solid grey;
                `}>
                No nav yet, links will go here
            </nav>
            <footer
                className={css`
                    grid-area: player;
                    border-top: 1px solid grey;
                `}>
                <Player />
                <br />
                <Counter />
            </footer>
        </div>
    </Providers>
)

function Providers(props: PropsWithChildren<{}>) {
    return (
        <Playback.Provider player={new AudioPlayer(0.1)}>
            <Library.Provider backendUrl="http://127.0.0.1:8280">{props.children}</Library.Provider>
        </Playback.Provider>
    )
}

export default hot(App)
