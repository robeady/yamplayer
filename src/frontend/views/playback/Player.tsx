import { css } from "linaria"
import { styled } from "linaria/react"
import React, { useEffect, useState } from "react"
import { MdRepeat, MdShuffle, MdSkipNext, MdSkipPrevious } from "react-icons/md"
import { useDispatch, useSelector } from "react-redux"
import { AlbumImage } from "../../components/AlbumImage"
import { DotDotDot, Noverflow, Row } from "../../elements"
import { AlbumLink } from "../../elements/links"
import { formatTime } from "../../formatting"
import { audio } from "../../state/actions"
import { resolveCanonical } from "../../state/catalogue"
import { currentTrack } from "../../state/queue"
import { colors } from "../../styles"
import { PlayPauseButton } from "./PlayPause"
import { Slider } from "./Slider"
import { VolumeControl } from "./Volume"

export function Player() {
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
    const nowPlayingTrackId = useSelector(s => currentTrack(s.player.queue))
    const playingTrack = useSelector(s => resolveCanonical(s.catalogue.tracks, nowPlayingTrackId))
    const playingAlbum = useSelector(s => resolveCanonical(s.catalogue.albums, playingTrack?.albumId))
    const playingArtist = useSelector(s => resolveCanonical(s.catalogue.artists, playingTrack?.artistIds[0]))

    return nowPlayingTrackId === undefined ? (
        <span>We are {status.state}</span>
    ) : (
        <div
            className={css`
                padding: 16px;
            `}>
            <Row className={css`gap: 12px;`}>
                <AlbumImage album={playingAlbum} size={48} />
                <Noverflow>
                    <DotDotDot>{playingTrack?.title}</DotDotDot>
                    <DotDotDot className={css`color: ${colors.gray6}; font-size: 14px;`}>
                        {playingArtist?.name} • <AlbumLink album={playingAlbum} />
                    </DotDotDot>
                </Noverflow>
            </Row>
        </div>
    )
}

function ControlsAndProgressBar() {
    return (
        <div className={css`display: flex; flex-direction: column;`}>
            <PlayPauseSkipControls />
            <ProgressBar />
        </div>
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
            <MdSkipPrevious
                className={css`
                    cursor: pointer;
                `}
                size={32}
                fill="slategray"
                onClick={() => dispatch(audio.skipBack())}
            />
            <div className={css`margin-left: 12px; margin-right: 12px;`}>
                <PlayPause size={32} />
            </div>
            <MdSkipNext
                className={css`cursor: pointer;`}
                fill="slategray"
                size={32}
                onClick={() => dispatch(audio.skipNext())}
            />
        </div>
    )
}

function PlayPause(props: { size: number }) {
    const status = useSelector(s => s.player.status)
    const dispatch = useDispatch()
    if (status.state === "stopped") {
        return <PlayPauseButton icon="play" size={props.size} />
    } else if (status.state === "paused") {
        return <PlayPauseButton icon="play" size={props.size} onClick={() => dispatch(audio.unpause())} />
    } else {
        return <PlayPauseButton icon="pause" size={props.size} onClick={() => dispatch(audio.pause())} />
    }
}

function ProgressBar() {
    const dispatch = useDispatch()
    const status = useSelector(s => s.player.status)
    const duration = useSelector(
        s => resolveCanonical(s.catalogue.tracks, currentTrack(s.player.queue))?.durationSecs,
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
                <Slider value={sliderValue} onChange={v => dispatch(audio.seekTo(v * duration!))} />
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
    const dispatch = useDispatch()
    const shuffle = useSelector(s => s.player.shuffle)
    const repeat = useSelector(s => s.player.repeat)
    return (
        <div
            className={css`
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding: 16px;
                gap: 12px;
            `}>
            <ToggleButton enabled={shuffle}>
                <MdShuffle onClick={() => dispatch(audio.toggleShuffle())} size={20} />
            </ToggleButton>
            <ToggleButton enabled={repeat}>
                <MdRepeat onClick={() => dispatch(audio.toggleRepeat())} size={20} />
            </ToggleButton>
            <VolumeControl />
        </div>
    )
}

const ToggleButton = styled.div<{ enabled?: boolean }>`
    color: ${props => (props.enabled ? colors.purple6 : colors.gray6)};
    &:hover {
        color: ${colors.gray8};
    }
`

const clamp = (number: number, min: number, max: number) => (number < min ? min : number > max ? max : number)
