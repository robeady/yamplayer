import React, { useState } from "react"
import { remote } from "../backend/rpc/client"
import { DeezerApiClient, TrackSearchResult } from "../backend/deezer/gateway"
import { DeezerCodec } from "../backend/deezer/DeezerCodec"
import { Playback } from "./playback/Player"
import { Library } from "./library/library"

function SearchBox(props: { onSubmit: (text: string) => void }) {
    const [text, setText] = useState("")
    return (
        <label>
            Search tracks:{" "}
            <input
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
                <li key={t.id} onClick={() => props.onClick(t.id)}>
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
    const [results, setResults] = useState(null as TrackSearchResult[] | null)
    const { playTrack } = Playback.use(p => p.actions)
    const { search } = Library.use(l => l)
    return (
        <>
            <SearchBox onSubmit={query => search(query).then(setResults)} />
            <SearchResults
                tracks={(results ?? []).map(r => ({
                    title: r.track.title,
                    id: r.track.externalId,
                    artistName: r.artist.name,
                }))}
                onClick={async id => {
                    const result = results!.find(t => t.track.externalId === id)
                    const buffer = await downloadAndDecryptTrack(id)
                    playTrack(result!.track.title, buffer)
                }}
            />
        </>
    )
}
