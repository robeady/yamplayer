import * as React from "react"
import { Playback } from "./playback/playback"
import { Play, Pause, ForwardStep, BackwardStep } from "react-zondicons"
import { css } from "linaria"
import { PlayPauseButton } from "./atoms/PlayPause"
import ReactSlider from "react-slider"
import { useState, useEffect } from "react"

const Player = () => {
    const status = Playback.useState(s => s.status)
    const volume = Playback.useState(s => s.volume)
    const { setVolume, skipNext } = Playback.useDispatch()

    return (
        <div
            className={css`
                display: grid;
                align-items: center;
                grid-template-columns: 300px auto 500px 500px;
            `}>
            <div>
                <span>We are {status.state}. Volume: </span>
                <input
                    type="number"
                    value={volume}
                    step={0.01}
                    min={0}
                    max={1}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                />
            </div>
            <div
                className={css`
                    display: flex;
                    align-items: center;
                    justify-self: center;
                `}>
                <BackwardStep
                    className={css`
                        fill: #666;
                    `}
                    size={28}
                />
                <div
                    className={css`
                        margin-left: 16px;
                        margin-right: 16px;
                    `}>
                    <PlayPause size={28} />
                </div>
                <ForwardStep
                    className={css`
                        fill: #666;
                        cursor: pointer;
                    `}
                    size={28}
                    onClick={() => skipNext()}
                />
            </div>
            <ProgressBar />
            <NowPlaying />
        </div>
    )
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

    const sliderProps = {
        trackClassName: css`
            background: gainsboro;
            height: 6px;
            /* TODO: when stopped, put border radius at top level? */
            &:first-child {
                background: hsl(270, 100%, 70%);
                border-top-left-radius: 3px;
                border-bottom-left-radius: 3px;
            }
            &:last-child {
                border-top-right-radius: 3px;
                border-bottom-right-radius: 3px;
            }
        `,
        thumbClassName: css`
            background: hsl(270, 100%, 40%);
            height: 16px;
            width: 16px;
            border-radius: 50%;
            top: -5px;
        `,
        min: 0,
        max: 1,
        step: 0.0001,
    }

    if (status.state === "stopped") {
        return <ReactSlider {...sliderProps} thumbClassName="" />
    } else if (status.state === "paused") {
        return <ReactSlider {...sliderProps} value={status.atPosition / songDuration} />
    } else {
        const millisElapsed = timestampMillis - status.sinceTimestampMillis
        const position = clamp(status.positionAtTimestamp + millisElapsed / 1000, 0, songDuration)
        return <ReactSlider {...sliderProps} value={position / songDuration} />
    }
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

function NowPlaying() {
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
