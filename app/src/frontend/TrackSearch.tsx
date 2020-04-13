/** @jsx jsx */
import { jsx } from "theme-ui"
import { useState, useEffect, Fragment } from "react"
import { remote } from "../backend/rpc/client"
import { DeezerApiClient } from "../backend/deezer/gateway"
import { DeezerCodec } from "../backend/deezer/DeezerCodec"
import { Playback } from "./playback/Player"
import { Library } from "./library/library"

function SearchBox(props: { onSubmit: (text: string) => void }) {
    const [text, setText] = useState("")
    return (
        <label>
            Search tracks:{" "}
            <input
                sx={{ border: 0, background: "#eee", fontSize: 2, p: 2 }}
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyPress={e => {
                    if (e.key === "Enter") props.onSubmit(text)
                }}
            />
        </label>
    )
}

interface Track {
    id: string
    title: string
    artistName: string
}

function SearchResults(props: { tracks: Track[]; onClick: (trackId: string) => void }) {
    return (
        <ol>
            {props.tracks.map(t => (
                <li
                    sx={{ "&:hover": { color: "primary", cursor: "pointer" } }}
                    key={t.id}
                    onClick={() => props.onClick(t.id)}
                >
                    {t.title} – {t.artistName}
                </li>
            ))}
        </ol>
    )
}

const client = remote<DeezerApiClient>("http://127.0.0.1:8280/deezer")

async function downloadAndDecryptTrack(id: string) {
    const url = await client.getTrackUrl(id)
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const sngId = id.split(":")[1]
    return new DeezerCodec().decodeTrack(new Uint8Array(buffer), sngId)
}

export function TrackSearch() {
    const [searchQuery, setSearchQuery] = useState(null as string | null)

    const { playTrack } = Playback.useDispatch()
    const { update } = Library.useDispatch()

    // let's implement the search query here
    const searchResults = Library.useState(s => searchQuery && s.searchResultsByQuery[searchQuery])

    useEffect(() => {
        async function fetchSearchResults() {
            if (searchResults === undefined && searchQuery !== null) {
                console.log(`searching for ${searchQuery}`)
                const results = await client.searchTracks(searchQuery)
                console.log(`results: ${JSON.stringify(results)}`)
                update(s => void (s.searchResultsByQuery[searchQuery] = results))
            }
        }
        fetchSearchResults()
    }, [searchQuery, searchResults, update])

    return (
        <Fragment>
            <SearchBox onSubmit={setSearchQuery} />
            <SearchResults
                tracks={(searchResults || []).map(r => ({
                    title: r.track.title,
                    id: r.track.externalId,
                    artistName: r.artist.name,
                }))}
                onClick={async id => {
                    const result = (searchResults || []).find(t => t.track.externalId === id)
                    const buffer = await downloadAndDecryptTrack(id)
                    playTrack(result!.track.title, buffer)
                }}
            />
        </Fragment>
    )
}
