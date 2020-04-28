import * as React from "react"
import { Playback } from "./playback/playback"
import SkipPrevious from "./icons/skip_previous.svg"
import SkipNext from "./icons/skip_next.svg"
import { css } from "linaria"
import { PlayPauseButton } from "./components/PlayPause"

import { useState, useEffect } from "react"
import { Slider } from "./components/Slider"
import { VolumeControl } from "./components/Volume"

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
    const status = Playback.useState(s => s.status)
    const nowPlaying = Playback.useState(s => s.queue[0])
    if (nowPlaying === undefined) {
        return <span>We are {status.state}</span>
    } else {
        return (
            <div
                className={css`
                    padding: 16px;
                `}>
                <div
                    className={css`
                        display: flex;
                    `}>
                    <img />
                    <div>
                        <div>{nowPlaying.title}</div>
                        <div>Artist here</div>
                    </div>
                </div>
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
    const { skipNext } = Playback.useDispatch()
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
                fill="#666"
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
                fill="#666"
                width={32}
                height={32}
                onClick={() => skipNext()}
            />
        </div>
    )
}

function PlayPause(props: { size: number }) {
    const status = Playback.useState(s => s.status)
    const { pause, unpause } = Playback.useDispatch()
    if (status.state === "stopped") {
        return <PlayPauseButton icon="play" disabled {...props} />
    } else if (status.state === "paused") {
        return <PlayPauseButton icon="play" {...props} onClick={unpause} />
    } else {
        return <PlayPauseButton icon="pause" {...props} onClick={pause} />
    }
}

function ProgressBar() {
    const status = Playback.useState(s => s.status)
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
                <Slider value={sliderValue} onChange={v => /* TODO seek */ {}} />
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
                color: darkslategray;
            `}>
            {formatTime(props.time)}
        </span>
    )
}

function formatTime(totalSecs: number | null) {
    if (totalSecs === null) return <span />
    const totalSeconds = Math.round(totalSecs)
    const mins = Math.floor(totalSeconds / 60)
    const secs = (totalSeconds % 60).toString().padStart(2, "0")
    return `${mins}:${secs}`
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
    const queue = Playback.useState(s => s.queue)
    return (
        <div>
            <br />
            <span>Now playing:</span>
            <ol>
                {queue.map(item => (
                    <li>{item.title}</li>
                ))}
            </ol>
        </div>
    )
}

const clamp = (number: number, min: number, max: number) => (number < min ? min : number > max ? max : number)

export default Player
