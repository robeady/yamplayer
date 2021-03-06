import { css } from "linaria"
import * as React from "react"
import { useEffect, useState } from "react"
import { MdRepeat, MdShuffle } from "react-icons/md"
import { useDispatch, useSelector } from "react-redux"
import { PlayPauseButton } from "./components/PlayPause"
import { Slider } from "./components/Slider"
import { VolumeControl } from "./components/Volume"
import { Col, DotDotDot, Flex, Noverflow } from "./elements"
import { formatTime } from "./formatting"
import SkipNext from "./icons/skip_next.svg"
import SkipPrevious from "./icons/skip_previous.svg"
import { audio } from "./state/actions"
import { resolveCanonical } from "./state/catalogue"
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
    const status = useSelector(s => s.player.status)
    const nowPlayingTrackId = useSelector(s => s.player.queue.current)
    const playingTrack = useSelector(s =>
        nowPlayingTrackId === null ? undefined : resolveCanonical(s.catalogue.tracks, nowPlayingTrackId),
    )
    const playingAlbum = useSelector(
        s => playingTrack && resolveCanonical(s.catalogue.albums, playingTrack.albumId),
    )
    const playingArtist = useSelector(
        s => playingTrack && resolveCanonical(s.catalogue.artists, playingTrack.artistId),
    )

    return nowPlayingTrackId === null ? (
        <span>We are {status.state}</span>
    ) : (
        <div
            className={css`
                padding: 16px;
            `}>
            <Flex className={css`gap: 12px;`}>
                <img src={playingAlbum?.coverImageUrl ?? undefined} width={48} />
                <Noverflow>
                    <DotDotDot>{playingTrack?.title}</DotDotDot>
                    <DotDotDot className={css`color: ${colors.gray6};`}>
                        {playingArtist?.name} • {playingAlbum?.title}
                    </DotDotDot>
                </Noverflow>
            </Flex>
        </div>
    )
}

function ControlsAndProgressBar() {
    return (
        <Col>
            <PlayPauseSkipControls />
            <ProgressBar />
        </Col>
    )
}

function PlayPauseSkipControls() {
    const dispatch = useDispatch()
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
                onClick={() => dispatch(audio.skipNext())}
            />
        </div>
    )
}

function PlayPause(props: { size: number }) {
    const status = useSelector(s => s.player.status)
    const dispatch = useDispatch()
    if (status.state === "stopped") {
        return <PlayPauseButton icon="play" disabled {...props} />
    } else if (status.state === "paused") {
        return <PlayPauseButton icon="play" {...props} onClick={() => dispatch(audio.pause())} />
    } else {
        return <PlayPauseButton icon="pause" {...props} onClick={() => dispatch(audio.pause())} />
    }
}

function ProgressBar() {
    const status = useSelector(s => s.player.status)
    const duration = useSelector(s =>
        s.player.queue.current === null
            ? null
            : resolveCanonical(s.catalogue.tracks, s.player.queue.current).durationSecs,
    )
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
        status.state === "stopped" || status.state === "loading"
            ? null
            : status.state === "paused"
            ? status.position
            : clamp(status.positionAtTimestamp + (timestampMillis - status.sinceMillis) / 1000, 0, duration!)
    const sliderValue = songPosition === null ? null : songPosition / duration!

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
            <TrackTime time={duration ?? 0} />
        </div>
    )
}

function TrackTime(props: { time: number }) {
    return (
        <span
            className={css`
                font-size: 14px;
                color: ${colors.gray6};
            `}>
            {formatTime(props.time)}
        </span>
    )
}

const playerIcon = css`
    color: ${colors.gray6};
    &:hover {
        color: ${colors.gray8};
    }
`

function SecondaryControls() {
    return (
        <div
            className={css`
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding: 16px;
                gap: 12px;
            `}>
            <MdShuffle className={playerIcon} size={20} />
            <MdRepeat className={playerIcon} size={20} />
            <VolumeControl />
        </div>
    )
}

export function NowPlaying() {
    const queue = useSelector(s => s.player.queue)
    return (
        <div>
            <br />
            <span>Up next:</span>
            <ol>
                {queue.next.map(trackId => (
                    <li key={trackId}>{trackId}</li>
                ))}
            </ol>
        </div>
    )
}

const clamp = (number: number, min: number, max: number) => (number < min ? min : number > max ? max : number)

export default Player
