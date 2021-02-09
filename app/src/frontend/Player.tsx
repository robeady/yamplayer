import { css } from "linaria"
import * as React from "react"
import { useEffect, useState } from "react"
import { PlayPauseButton } from "./components/PlayPause"
import { Slider } from "./components/Slider"
import { VolumeControl } from "./components/Volume"
import { DotDotDot, Flex, Noverflow } from "./elements"
import { formatTime } from "./formatting"
import SkipNext from "./icons/skip_next.svg"
import SkipPrevious from "./icons/skip_previous.svg"
import { resolveCanonical, useExplorerState } from "./state/library"
import { usePlayerDispatch, usePlayerState } from "./state/playback"
import { colors } from "./styles"

const Player = () => {
    return (
        <div
            className={css`
                display: grid;
                align-items: center;
                grid-template-columns: 300px auto 300px;
            `}>
            <PlayingTrack />
            <ControlsAndProgressBar />
            <SecondaryControls />
        </div>
    )
}

function PlayingTrack() {
    const status = usePlayerState(s => s.status)
    const nowPlayingTrackId = usePlayerState(s => s.queue[0]?.trackId as string | undefined)
    const playingTrack = useExplorerState(s =>
        nowPlayingTrackId === undefined ? undefined : resolveCanonical(s.tracks, nowPlayingTrackId),
    )
    const playingAlbum = useExplorerState(
        s => playingTrack && resolveCanonical(s.albums, playingTrack.albumId),
    )
    const playingArtist = useExplorerState(
        s => playingTrack && resolveCanonical(s.artists, playingTrack.artistId),
    )

    if (nowPlayingTrackId === undefined) {
        return <span>We are {status.state}</span>
    } else {
        return (
            <div
                className={css`
                    padding: 16px;
                `}>
                <Flex className={css`gap: 12px; justify-content: space-between;`}>
                    <img src={playingAlbum?.coverImageUrl ?? undefined} width={48} />
                    <Noverflow>
                        <DotDotDot>{playingTrack?.title}</DotDotDot>
                        <DotDotDot className={css`color: ${colors.grey2};`}>
                            {playingArtist?.name} • {playingAlbum?.title}
                        </DotDotDot>
                    </Noverflow>
                </Flex>
            </div>
        )
    }
}

function ControlsAndProgressBar() {
    return (
        <div
            className={css`
                display: flex;
                flex-direction: column;
            `}>
            <PlayPauseSkipControls />
            <ProgressBar />
        </div>
    )
}

function PlayPauseSkipControls() {
    const { skipNext } = usePlayerDispatch()
    return (
        <div
            className={css`
                display: flex;
                align-items: center;
                align-self: center;
                justify-self: center;
                padding-top: 16px;
            `}>
            <SkipPrevious
                className={css`
                    cursor: pointer;
                `}
                width={36}
                height={36}
                fill="slategray"
            />
            <div
                className={css`
                    margin-left: 12px;
                    margin-right: 12px;
                `}>
                <PlayPause size={32} />
            </div>
            <SkipNext
                className={css`
                    cursor: pointer;
                `}
                fill="slategray"
                width={32}
                height={32}
                onClick={() => skipNext()}
            />
        </div>
    )
}

function PlayPause(props: { size: number }) {
    const status = usePlayerState(s => s.status)
    const { pause, unpause } = usePlayerDispatch()
    if (status.state === "stopped") {
        return <PlayPauseButton icon="play" disabled {...props} />
    } else if (status.state === "paused") {
        return <PlayPauseButton icon="play" {...props} onClick={unpause} />
    } else {
        return <PlayPauseButton icon="pause" {...props} onClick={pause} />
    }
}

function ProgressBar() {
    const status = usePlayerState(s => s.status)
    const songDuration = 180 // TODO
    const refreshIntervalMillis = 500

    const [timestampMillis, setTimestampMillis] = useState(performance.now())
    useEffect(() => {
        if (status.state === "playing") {
            setTimestampMillis(performance.now())
            const handle = setInterval(() => setTimestampMillis(performance.now()), refreshIntervalMillis)
            return () => clearInterval(handle)
        }
    }, [status.state])

    const songPosition =
        status.state === "stopped"
            ? null
            : status.state === "paused"
            ? status.atPosition
            : clamp(
                  status.positionAtTimestamp + (timestampMillis - status.sinceTimestampMillis) / 1000,
                  0,
                  songDuration,
              )
    const sliderValue = songPosition === null ? null : songPosition / songDuration

    return (
        <div
            className={css`
                display: flex;
                align-items: center;
            `}>
            <TrackTime time={songPosition ?? 0} />
            <div
                className={css`
                    flex: 1;
                    padding: 16px 12px;
                `}>
                <Slider value={sliderValue} onChange={v => v /* TODO implement seeking */} />
            </div>
            <TrackTime time={songDuration} />
        </div>
    )
}

function TrackTime(props: { time: number }) {
    return (
        <span
            className={css`
                font-size: 14px;
                color: ${colors.grey2};
            `}>
            {formatTime(props.time)}
        </span>
    )
}

function SecondaryControls() {
    return (
        <div
            className={css`
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding: 16px;
            `}>
            <div>(Shuffle)</div>
            <div>(Repeat)</div>
            <VolumeControl />
        </div>
    )
}

export function NowPlaying() {
    const queue = usePlayerState(s => s.queue)
    return (
        <div>
            <br />
            <span>Now playing:</span>
            <ol>
                {queue.map(item => (
                    <li key={item.trackId}>{item.trackId}</li>
                ))}
            </ol>
        </div>
    )
}

const clamp = (number: number, min: number, max: number) => (number < min ? min : number > max ? max : number)

export default Player
