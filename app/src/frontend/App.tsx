import { css } from "linaria"
import React, { PropsWithChildren, useRef, useState } from "react"
import { hot } from "react-hot-loader/root"
import { HashRouter, Route, Switch } from "react-router-dom"
import { ImportItunesResult } from "../backend/explorer"
import { LeftNav } from "./components/Navigation"
import { LibraryTracks } from "./LibraryTracks"
import Player, { NowPlaying } from "./Player"
import { AudioPlayer } from "./state/AudioPlayer"
import { ExplorerProvider, useExplorerDispatch } from "./state/library"
import { PlaybackProvider } from "./state/playback"
import { TrackSearch } from "./TrackSearch"

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
                    <Route path="/import">
                        <Import />
                    </Route>
                    <Route path="/">Welcome!</Route>
                </Switch>
            </main>
        </div>
    )
}

function Import() {
    const { importItunesLibrary } = useExplorerDispatch()
    const [uploadStats, setUploadStats] = useState<ImportItunesResult["stats"]>()
    return (
        <div>
            <div>Upload your itunes library xml file</div>
            <input
                type="file"
                accept=".xml"
                onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    importItunesLibrary(file).then(setUploadStats)
                    e.target.value = ""
                }}
            />
            {uploadStats && (
                <div>
                    Import suceeded! From {uploadStats.numTracksInItunes} itunes tracks, we added{" "}
                    {uploadStats.numNewTracksCatalogued} tracks, {uploadStats.numNewAlbumsCatalogued} albums
                    and {uploadStats.numNewArtistsCatalogued} artists to your library.
                </div>
            )}
        </div>
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
