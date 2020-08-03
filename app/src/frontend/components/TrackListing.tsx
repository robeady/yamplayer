import React from "react"
import { styled } from "linaria/react"
import { css } from "linaria"
import PlayArrow from "../icons/play_arrow.svg"
import { useExplorerState, resolveCanonical, useExplorerDispatch } from "../library/library"
import { usePlayerDispatch } from "../playback/playback"
import { Album, Track } from "../../model"

export function TrackListing(props: { trackIds: string[] }) {
    const allTracks = useExplorerState(s => s.tracks)
    const allAlbums = useExplorerState(s => s.albums)
    const allArtists = useExplorerState(s => s.artists)
    const { addToLibrary } = useExplorerDispatch()
    const tracksToList = props.trackIds.map(trackId => {
        const track = resolveCanonical(allTracks, trackId)
        const artist = resolveCanonical(allArtists, track.artistId)
        const album = resolveCanonical(allAlbums, track.albumId)
        return { trackId, track, artist, album }
    })

    const { enqueueTrack } = usePlayerDispatch()

    return (
        <div
            className={css`
                font-size: 14px;
            `}>
            {tracksToList.map(t => (
                <TrackRow
                    key={t.trackId}
                    onClick={e => {
                        // if this is the second click, prevent text selection
                        if (e.detail === 2) {
                            e.preventDefault()
                        }
                    }}
                    onDoubleClick={() => enqueueTrack(t.track)}>
                    <CoverAndTrackTitle {...t} />
                    <span
                        className={css`
                            color: rgb(90, 90, 90);
                            &:hover {
                                text-decoration: underline;
                            }
                        `}>
                        {t.album.title}
                    </span>
                    <span
                        className={css`
                            color: rgb(90, 90, 90);
                            &:hover {
                                text-decoration: underline;
                            }
                        `}>
                        {t.artist.name}
                    </span>
                    <AddToLibraryButton onClick={() => addToLibrary(t.trackId)} alreadyInLibrary={t.track.saved} />
                </TrackRow>
            ))}
        </div>
    )
}

function CoverAndTrackTitle(props: { track: Track; album: Album }) {
    return (
        <div
            className={css`
                display: flex;
                align-items: center;
            `}>
            <CoverImage url={props.album.coverImageUrl ?? ""} size={36} />
            <span
                className={css`
                    padding-left: 12px;
                `}>
                {props.track.title}
            </span>
        </div>
    )
}

function CoverImage(props: { url: string; size: number }) {
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
                <PlayCircle displayed size={props.size - 4} />
            </div>
        </div>
    )
}

const TrackRow = styled.div`
    padding: 0 4px;
    height: 40px;
    display: grid;
    grid-template-columns: auto 30% 20% 50px;
    align-items: center;
    border-bottom: 1px solid rgb(225, 225, 235);
    &:hover {
        background: rgb(245, 245, 248);
    }
`

function PlayCircle(props: { displayed: boolean; size: number }) {
    if (!props.displayed) return null
    return (
        <div
            className={css`
                background: hsl(270, 100%, 50%);
                border-radius: 50%;
                display: none;
                ${TrackRow}:hover & {
                    display: block;
                }
                cursor: pointer;
            `}>
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

function AddToLibraryButton(props: { alreadyInLibrary: boolean; onClick: () => void }) {
    return (
        <button disabled={props.alreadyInLibrary} onClick={props.onClick}>
            Add
        </button>
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
