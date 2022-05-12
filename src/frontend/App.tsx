import { MantineProvider } from "@mantine/core"
import { css } from "linaria"
import React, { useEffect, useState } from "react"
import { hot } from "react-hot-loader/root"
import { useDispatch } from "react-redux"
import { HashRouter, Route, Switch } from "react-router-dom"
import { ImportItunesResult } from "../backend/explorer"
import { LibraryTracks } from "./LibraryTracks"
import { catalogue } from "./state/actions"
import { colors } from "./styles"
import { AlbumPage } from "./views/AlbumPage"
import { DiscoveryPage } from "./views/DiscoveryPage"
import { LibraryAlbumsPage } from "./views/LibraryAlbumsPage"
import { LeftNav } from "./views/Navigation"
import { NowPlaying } from "./views/NowPlaying"
import { Player } from "./views/playback/Player"
import { TrackSearch } from "./views/TrackSearch"

function App() {
    return (
        <MantineProvider theme={{ primaryColor: "violet" }}>
            <HashRouter>
                <AppLayout />
            </HashRouter>
        </MantineProvider>
    )
}

function AppLayout() {
    return (
        <div
            className={css`
                height: 100vh;
                display: grid;
                grid-template-columns: min-content 1fr;
                grid-template-rows: 1fr min-content;
                grid-template-areas: "sidebar main" "footer footer";
            `}>
            <div className={css`grid-area: sidebar;`}>
                <LeftNav />
            </div>
            {/* padding at the top of the page has to be zero for sticky table headings */}
            <main className={css`grid-area: main; overflow-y: auto; padding: 0 24px;`}>
                <Content />
            </main>
            <footer
                className={css`
                    grid-area: footer;
                    border-top: 1px solid gainsboro;
                    background: ${colors.gray1};
                `}>
                <Player />
            </footer>
        </div>
    )
}

function Content() {
    const dispatch = useDispatch()
    useEffect(() => void dispatch(catalogue.getLibrary()), [dispatch])
    return (
        <Switch>
            <Route path="/now-playing">
                <NowPlaying />
            </Route>
            <Route path="/search">
                <TrackSearch />
            </Route>
            <Route path="/discover">
                <DiscoveryPage />
            </Route>
            <Route path="/library/tracks">
                <LibraryTracks />
            </Route>
            <Route path="/library/albums">
                <LibraryAlbumsPage />
            </Route>
            <Route
                path="/album/:albumId"
                render={routeProps => <AlbumPage albumId={routeProps.match.params.albumId} />}
            />
            <Route path="/import">
                <Import />
            </Route>
            <Route path="/">Welcome!</Route>
        </Switch>
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
                        .unwrap()
                        .then(r => setUploadStats(r.stats))
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
