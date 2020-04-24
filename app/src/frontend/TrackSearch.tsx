import React, { useState, useEffect } from "react"
import { remote } from "../backend/rpc/client"
import { DeezerApiClient } from "../backend/deezer/gateway"
import { DeezerCodec } from "../backend/deezer/DeezerCodec"
import { Playback } from "./playback/playback"
import { Library } from "./library/library"
import { css } from "linaria"
import { styled } from "linaria/react"
import PlayArrow from "./icons/play_arrow.svg"

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
    albumTitle: string
    artistName: string
    coverImageUrl: string
}

const TrackRow = styled.div`
    padding: 4px;
    display: grid;
    grid-template-columns: 50px 250px auto;
    align-items: center;
    border-bottom: 1px solid gainsboro;
`

function SearchResults(props: { tracks: Track[]; playTrack: (trackId: string) => void }) {
    return (
        <div
            className={css`
                font-size: 14px;
            `}>
            {props.tracks.map(t => (
                <TrackRow key={t.id}>
                    <CoverImage url={t.coverImageUrl} size={36} play={() => props.playTrack(t.id)} />
                    <TrackAndAlbumTitle track={t.title} play={() => props.playTrack(t.id)} album={t.albumTitle} />
                    <span>{t.artistName}</span>
                </TrackRow>
            ))}
        </div>
    )
}

function CoverImage(props: { url: string; size: number; play: () => void }) {
    return (
        <div
            className={css`
                position: relative;
            `}>
            <img
                className={css`
                    border-radius: 2px;
                    // border: 1px solid gainsboro;
                `}
                src={props.url}
                height={props.size}
                width={props.size}
            />
            <div
                className={css`
                    position: absolute;
                    top: 2px;
                    left: 2px;
                `}>
                <PlayCircle displayed size={props.size - 4} onClick={props.play} />
            </div>
        </div>
    )
}

function PlayCircle(props: { displayed: boolean; size: number; onClick: () => void }) {
    if (!props.displayed) return null
    return (
        <div
            className={css`
                background: hsl(270, 100%, 40%);
                border-radius: 50%;
                display: none;
                ${TrackRow}:hover & {
                    display: block;
                }
                cursor: pointer;
            `}
            onClick={props.onClick}>
            <PlayArrow
                className={css`
                    display: block;
                    padding: 4px;
                    margin: 0 -2px 0 2px;
                    fill: white;
                `}
                width={props.size - 8}
                height={props.size - 8}
            />
        </div>
    )
}

function TrackAndAlbumTitle(props: { track: string; album: string; play: () => void }) {
    return (
        <div
            className={css`
                display: flex;
                flex-direction: column;
            `}>
            <span
                onClick={props.play}
                className={css`
                    cursor: pointer;
                    &:hover {
                        color: hsl(270, 100%, 40%);
                    }
                `}>
                {props.track}
            </span>
            <span
                className={css`
                    color: SlateGray;
                `}>
                {props.album}
            </span>
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
        <div>
            <SearchBox onSubmit={setSearchQuery} />
            <SearchResults
                tracks={(searchResults || []).map(r => ({
                    id: r.track.externalId,
                    title: r.track.title,
                    albumTitle: r.album.title,
                    artistName: r.artist.name,
                    coverImageUrl: r.album.coverImageUrl,
                }))}
                playTrack={async id => {
                    const result = (searchResults || []).find(t => t.track.externalId === id)
                    const buffer = await downloadAndDecryptTrack(id)
                    enqueueTrack(id, result!.track.title, buffer)
                }}
            />
        </div>
    )
}
