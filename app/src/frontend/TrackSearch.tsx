import React, { useState } from "react"
import { remote } from "../backend/rpc/client"
import { DeezerApiClient } from "../backend/deezer/gateway"
import { DeezerCodec } from "../backend/deezer/DeezerCodec"
import { Playback } from "./playback/playback"
import { useLibrarySearch, useLibraryDispatch } from "./library/library"
import { css } from "linaria"
import { styled } from "linaria/react"
import PlayArrow from "./icons/play_arrow.svg"
import { Library } from "../backend/library"
import { keyBy } from "lodash"
import { TrackId } from "../model"

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
    libraryId: TrackId | null
    externalId: string
    title: string
    albumTitle: string
    artistName: string
    coverImageUrl: string
}

const TrackRow = styled.div`
    padding: 4px;
    display: grid;
    grid-template-columns: 50px 250px auto 50px;
    align-items: center;
    border-bottom: 1px solid gainsboro;
`

function SearchResults(props: {
    tracks: Track[]
    playTrack: (trackId: string) => void
    addTrackToLibrary: (trackId: string) => void
}) {
    return (
        <div
            className={css`
                font-size: 14px;
            `}>
            {props.tracks.map(t => (
                <TrackRow key={t.externalId}>
                    <CoverImage url={t.coverImageUrl} size={36} play={() => props.playTrack(t.externalId)} />
                    <TrackAndAlbumTitle
                        track={t.title}
                        play={() => props.playTrack(t.externalId)}
                        album={t.albumTitle}
                    />
                    <span>{t.artistName}</span>
                    <AddToLibraryButton
                        onClick={() => props.addTrackToLibrary(t.externalId)}
                        alreadyInLibrary={t.libraryId !== null}
                    />
                </TrackRow>
            ))}
        </div>
    )
}

function AddToLibraryButton(props: { alreadyInLibrary: boolean; onClick: () => void }) {
    return (
        <button disabled={props.alreadyInLibrary} onClick={props.onClick}>
            Add
        </button>
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
    const { libraryClient } = useLibraryDispatch()
    const searchResults = useLibrarySearch(searchQuery)
    const searchResultsByExternalTrackId = keyBy(searchResults, s => s.track.externalId)
    return (
        <div>
            <SearchBox onSubmit={setSearchQuery} />
            <SearchResults
                tracks={searchResults.map(r => ({
                    libraryId: r.track.libraryId,
                    externalId: r.track.externalId,
                    title: r.track.title,
                    albumTitle: r.album.title,
                    artistName: r.artist.name,
                    coverImageUrl: r.album.coverImageUrl,
                }))}
                playTrack={async id => {
                    const buffer = await downloadAndDecryptTrack(id)
                    enqueueTrack(id, buffer)
                }}
                addTrackToLibrary={externalId =>
                    libraryClient.addSearchResult(searchResultsByExternalTrackId[externalId])
                }
            />
        </div>
    )
}
