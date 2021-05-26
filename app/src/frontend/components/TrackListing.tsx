import { css } from "linaria"
import { styled } from "linaria/react"
import React from "react"
import Rating from "react-rating"
import { useDispatch, useSelector } from "react-redux"
import { Album, Track } from "../../model"
import PlayArrow from "../icons/play_arrow.svg"
import Star from "../icons/star_rate.svg"
import { audio, catalogue } from "../state/actions"
import { resolveCanonical } from "../state/catalogue"

export function TrackListing(props: { trackIds: string[] }) {
    const allTracks = useSelector(s => s.catalogue.tracks)
    const allAlbums = useSelector(s => s.catalogue.albums)
    const allArtists = useSelector(s => s.catalogue.artists)
    const dispatch = useDispatch()
    const tracksToList = props.trackIds.map(trackId => {
        const track = resolveCanonical(allTracks, trackId)
        const artist = resolveCanonical(allArtists, track.artistId)
        const album = resolveCanonical(allAlbums, track.albumId)
        return { trackId, track, artist, album }
    })

    return (
        <div className={css`font-size: 14px;`}>
            {tracksToList.map(t => (
                <TrackRow
                    key={t.trackId}
                    onClick={e => {
                        // if this is the second click, prevent text selection
                        if (e.detail === 2) {
                            e.preventDefault()
                        }
                    }}
                    onDoubleClick={() =>
                        dispatch(audio.play({ next: [t.track.catalogueId ?? t.track.externalId] }))
                    }>
                    <CoverAndTrackTitle {...t} />
                    <TrackRating
                        rating={t.track.rating}
                        enabled={t.track.catalogueId !== null}
                        onRate={newRating =>
                            dispatch(catalogue.setTrackRating({ trackId: t.track.catalogueId!, newRating }))
                        }
                    />
                    <span className={css`color: rgb(90, 90, 90); &:hover { text-decoration: underline; }`}>
                        {t.album.title}
                    </span>
                    <span className={css`color: rgb(90, 90, 90); &:hover { text-decoration: underline; }`}>
                        {t.artist.name}
                    </span>
                    <SaveButton trackId={t.trackId} />
                </TrackRow>
            ))}
        </div>
    )
}

const ratingClass = css``

function CroppedStar(props: { className: string }) {
    return <Star className={props.className} viewBox={"4 4 16 16"} width={16} height={16} />
}

function TrackRating(props: {
    enabled: boolean
    rating: number | null
    onRate: (newRating: number) => void
}) {
    return (
        <div className={ratingClass}>
            {props.enabled && (
                <Rating
                    // TODO: rounding
                    initialRating={(props.rating ?? 0) * 5}
                    onChange={newRating => props.onRate(newRating / 5)}
                    emptySymbol={<CroppedStar className={css`fill: hsl(0, 0%, 92%);`} />}
                    fullSymbol={
                        <CroppedStar
                            className={css`
                                fill: hsl(0, 0%, 75%);
                                .${ratingClass}:hover & {
                                    fill: hsl(270, 80%, 70%);
                                }
                            `}
                        />
                    }
                />
            )}
        </div>
    )
}

function CoverAndTrackTitle(props: { track: Track; album: Album }) {
    return (
        <div className={css`display: flex; align-items: center;`}>
            <CoverImage url={props.album.coverImageUrl ?? ""} size={36} />
            <span className={css`padding-left: 12px;`}>{props.track.title}</span>
        </div>
    )
}

function CoverImage(props: { url: string; size: number }) {
    return (
        <div className={css`position: relative;`}>
            <img
                className={css`border-radius: 2px; /* border: 1px solid gainsboro; */`}
                src={props.url}
                height={props.size}
                width={props.size}
            />
            <div className={css`position: absolute; top: 2px; left: 2px;`}>
                <PlayCircle displayed size={props.size - 4} />
            </div>
        </div>
    )
}

const TrackRow = styled.div`
    padding: 0 4px;
    height: 40px;
    display: grid;
    grid-template-columns: auto 100px 30% 20% 50px;
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

function SaveButton(props: { trackId: string }) {
    const track = useSelector(s => resolveCanonical(s.catalogue.tracks, props.trackId))
    const dispatch = useDispatch()
    return track.savedTimestamp === null ? (
        <button onClick={() => dispatch(catalogue.addToLibrary(track.externalId))}>Add</button>
    ) : (
        <button onClick={() => dispatch(catalogue.unsaveTrack(track.catalogueId!))}>-</button>
    )
}
