import { css } from "linaria"
import { styled } from "linaria/lib/react"
import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { Track } from "../../model"
import { unreachable } from "../../util"
import { Row, Subheading } from "../elements"
import { DropdownMenu, DropdownMenuItem, useDropdownMenu } from "../elements/DropdownMenu"
import { formatTime } from "../formatting"
import { audio, catalogue, view } from "../state/actions"
import { AudioQueue } from "../state/queue"
import { colors } from "../styles"
import { TrackRating } from "./Rating"

export type TrackTableColumn = "#" | "title" | "artist" | "duration" | "rating"

export function TrackTableHeader(props: { cols: TrackTableColumn[] }) {
    return (
        <Subheading>
            <Row className={css`height: 30px;`}>
                {props.cols.map(col => (
                    <TableHeading key={col} col={col} />
                ))}
            </Row>
        </Subheading>
    )
}

function TableHeading(props: { col: TrackTableColumn }) {
    switch (props.col) {
        case "#":
            return <TrackNumCol>#</TrackNumCol>
        case "title":
            return <TrackCol>Track</TrackCol>
        case "artist":
            return <TrackCol>Artist</TrackCol>
        case "duration":
            return <LengthCol>Length</LengthCol>
        case "rating":
            return <RatingCol>Rating</RatingCol>
        default:
            unreachable(props.col)
    }
}

export function TrackTable(props: {
    tracks: Track[]
    cols: TrackTableColumn[]
    buildTrackQueue: (fromTrackId: string) => AudioQueue
}) {
    return (
        <div className={css`width: 100%; padding: 10px 0;`}>
            {props.tracks.map(track => (
                <TrackRow
                    cols={props.cols}
                    key={track.catalogueId ?? track.externalId}
                    track={track}
                    buildTrackQueue={props.buildTrackQueue}
                />
            ))}
        </div>
    )
}

function TrackRow(props: {
    track: Track
    cols: TrackTableColumn[]
    buildTrackQueue: (fromTrackId: string) => AudioQueue
}) {
    const dispatch = useDispatch()

    const trackId = props.track.catalogueId ?? props.track.externalId
    const selected = useSelector(s => s.view.selectedTrackId)
    const TrackComponent = selected === trackId ? SelectedTrackFlex : TrackFlex

    const { state, show } = useDropdownMenu()

    return (
        <>
            <DropdownMenu state={state}>
                <DropdownMenuItem onClick={() => dispatch(audio.playLater([trackId]))}>
                    Play later
                </DropdownMenuItem>
            </DropdownMenu>
            <TrackComponent
                onContextMenu={show}
                onMouseDown={() => dispatch(view.selectedTrackChanged(trackId))}
                onDoubleClick={() => dispatch(audio.play(props.buildTrackQueue(trackId)))}
                className={css``}>
                {props.cols.map(col => (
                    <TrackRowColumn key={col} track={props.track} col={col} />
                ))}
            </TrackComponent>
        </>
    )
}

function TrackRowColumn(props: { col: TrackTableColumn; track: Track }) {
    const dispatch = useDispatch()
    const trackId = props.track.catalogueId ?? props.track.externalId
    switch (props.col) {
        case "#":
            return <TrackNumCol>{props.track.trackNumber}</TrackNumCol>
        case "title":
            return <TrackCol>{props.track.title}</TrackCol>
        case "artist":
            return <TrackCol>{props.track.title}</TrackCol>
        case "duration":
            return <LengthCol>{formatTime(props.track.durationSecs)}</LengthCol>

        case "rating":
            return (
                <RatingCol>
                    <TrackRating
                        rating={props.track.rating}
                        enabled={props.track.catalogueId !== null}
                        onRate={newRating => dispatch(catalogue.setTrackRating({ trackId, newRating }))}
                    />
                </RatingCol>
            )
        default:
            unreachable(props.col)
    }
}

const TrackFlex = styled.div`
    display: flex;
    align-items: center;
    padding: 2px 4px 3px;
    border-radius: 6px;
    &:last-child {
        border-bottom: 0;
    }
    &:hover {
        background: ${colors.gray1};
    }
`

const SelectedTrackFlex = styled(TrackFlex)`
    background: ${colors.purple9};
    &:hover {
        background: ${colors.purple8};
    }
`
const TableCol = styled.div`padding-right: 20px;`

const TrackNumCol = styled(TableCol)`flex: 0 0 40px; text-align: right; color: ${colors.gray6};`
const TrackCol = styled(TableCol)`flex: 0 0 500px;`
const RatingCol = styled(TableCol)`flex: 0 0 100px;`
const LengthCol = styled(TableCol)`flex: 0 0 100px;`
