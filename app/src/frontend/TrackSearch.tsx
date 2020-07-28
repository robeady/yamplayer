import React, { useState } from "react"
import { remote } from "../backend/rpc/client"
import { DeezerApiClient } from "../backend/deezer/gateway"
import { DeezerCodec } from "../backend/deezer/DeezerCodec"
import { Playback } from "./playback/playback"
import { useSearchResults, useExplorerDispatch, useExplorerState, resolveCanonical } from "./library/library"
import { css } from "linaria"
import { styled } from "linaria/react"
import PlayArrow from "./icons/play_arrow.svg"
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
    trackIds: string[]
    playTrack: (trackId: string) => void
    addTrackToLibrary: (trackId: string) => void
}) {
    const allTracks = useExplorerState(s => s.tracks)
    const allAlbums = useExplorerState(s => s.albums)
    const allArtists = useExplorerState(s => s.artists)
    const results = props.trackIds.map(trackId => {
        const track = resolveCanonical(allTracks, trackId)
        const artist = resolveCanonical(allArtists, track.artistId)
        const album = resolveCanonical(allAlbums, track.albumId)
        return { trackId, track, artist, album }
    })
    return (
        <div
            className={css`
                font-size: 14px;
            `}>
            {results.map(t => (
                <TrackRow key={t.trackId}>
                    <CoverImage url={t.album.coverImageUrl ?? ""} size={36} play={() => props.playTrack(t.trackId)} />
                    <TrackAndAlbumTitle
                        track={t.track.title}
                        play={() => props.playTrack(t.trackId)}
                        album={t.album.title}
                    />
                    <span>{t.artist.name}</span>
                    <AddToLibraryButton
                        onClick={() => props.addTrackToLibrary(t.trackId)}
                        alreadyInLibrary={t.track.saved}
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
    const { explorerClient } = useExplorerDispatch()
    const searchResults = useSearchResults(searchQuery)
    return (
        <div>
            <SearchBox onSubmit={setSearchQuery} />
            <SearchResults
                trackIds={searchResults.externalTrackIds}
                playTrack={async id => {
                    const buffer = await downloadAndDecryptTrack(id)
                    enqueueTrack(id, buffer)
                }}
                addTrackToLibrary={externalId => explorerClient.addTrack(externalId)}
            />
        </div>
    )
}
