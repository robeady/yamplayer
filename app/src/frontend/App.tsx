import { isFulfilled } from "@reduxjs/toolkit"
import { css } from "linaria"
import React, { useEffect, useState } from "react"
import { hot } from "react-hot-loader/root"
import { useDispatch } from "react-redux"
import { HashRouter, Route, Switch } from "react-router-dom"
import { ImportItunesResult } from "../backend/explorer"
import { LeftNav } from "./components/Navigation"
import { LibraryTracks } from "./LibraryTracks"
import Player, { NowPlaying } from "./Player"
import { catalogue } from "./state/actions"
import { TrackSearch } from "./TrackSearch"

const App = () => (
    <HashRouter>
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
    </HashRouter>
)

function Main() {
    const dispatch = useDispatch()
    useEffect(() => {
        void dispatch(catalogue.getLibrary())
    }, [dispatch])
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
    const dispatch = useDispatch()
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
                    dispatch(catalogue.importItunesLibrary(file))
                        .then(r => {
                            if (isFulfilled(r)) {
                                setUploadStats(r.payload.stats)
                            }
                        })
                        .catch(error => console.error(error) /* _Toast_? */)
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

export default hot(App)
