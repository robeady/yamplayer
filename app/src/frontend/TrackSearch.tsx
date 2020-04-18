import React, { useState, useEffect, Fragment } from "react"
import { remote } from "../backend/rpc/client"
import { DeezerApiClient } from "../backend/deezer/gateway"
import { DeezerCodec } from "../backend/deezer/DeezerCodec"
import { Playback } from "./playback/playback"
import { Library } from "./library/library"
import { css } from "linaria"

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
    coverImageUrl: string
}

function SearchResults(props: { tracks: Track[]; onClick: (trackId: string) => void }) {
    return (
        <div>
            {props.tracks.map(t => (
                <div
                    className={css`
                        display: flex;
                        align-items: center;
                        margin: 8px;
                    `}
                    key={t.id}>
                    <img src={t.coverImageUrl} height={32} />
                    <span
                        onClick={() => props.onClick(t.id)}
                        className={css`
                            cursor: pointer;
                            margin-left: 8px;
                            &:hover {
                                color: hsl(330, 80%, 35%);
                            }
                        `}>
                        {t.title} – {t.artistName}
                    </span>
                </div>
            ))}
        </div>
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

    const { enqueueTrack } = Playback.useDispatch()
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
                    coverImageUrl: r.album.coverImageUrl,
                }))}
                onClick={async id => {
                    const result = (searchResults || []).find(t => t.track.externalId === id)
                    const buffer = await downloadAndDecryptTrack(id)
                    enqueueTrack(result!.track.title, buffer)
                }}
            />
        </Fragment>
    )
}
