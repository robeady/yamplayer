import { hot } from "react-hot-loader/root"
import React, { PropsWithChildren, useRef } from "react"
import Counter from "./Counter"
import Player, { NowPlaying } from "./Player"
import { TrackSearch } from "./TrackSearch"
import { css } from "linaria"
import { AudioPlayer } from "./playback/AudioPlayer"
import { ExplorerProvider } from "./library/library"
import { Link, Switch, Route, HashRouter } from "react-router-dom"
import { LibraryTracks } from "./LibraryTracks"
import { PlaybackProvider } from "./playback/playback"

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
    return (
        <div
            className={css`
                display: flex;
            `}>
            <LeftNav />
            <main
                className={css`
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                `}>
                <Switch>
                    <Route path="/now-playing">
                        <NowPlaying />
                    </Route>
                    <Route path="/search">
                        <TrackSearch />
                    </Route>
                    <Route path="/library/tracks">
                        <LibraryTracks />
                    </Route>
                    <Route path="/">Welcome!</Route>
                </Switch>
            </main>
        </div>
    )
}

function LeftNav() {
    return (
        <nav
            className={css`
                width: 200px;
                padding: 16px;
                border-right: 1px solid gainsboro;
            `}>
            <div>
                <Link to="/now-playing">Now Playing</Link>
            </div>
            <div>
                <Link to="/search">Search</Link>
            </div>
            <div>
                <Link to="/library/tracks">Library Tracks</Link>
            </div>
            <br />
            <Counter />
        </nav>
    )
}

function Providers(props: PropsWithChildren<{}>) {
    // a ref has consistent identity across hot reloads
    const playerRef = useRef(new AudioPlayer(0.1))
    return (
        <HashRouter>
            <ExplorerProvider backendUrl="http://127.0.0.1:8280">
                <PlaybackProvider player={playerRef.current}>{props.children}</PlaybackProvider>
            </ExplorerProvider>
        </HashRouter>
    )
}

export default hot(App)
