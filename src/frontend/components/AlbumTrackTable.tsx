import { css } from "linaria"
import { styled } from "linaria/lib/react"
import { upperFirst } from "lodash"
import React, { CSSProperties, ReactNode } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Track } from "../../model"
import { Row, Subheading } from "../elements"
import { DropdownMenu, DropdownMenuItem, useDropdownMenu } from "../elements/DropdownMenu"
import { formatTime } from "../formatting"
import { audio, catalogue, view } from "../state/actions"
import { resolveCanonical } from "../state/catalogue"
import { AudioQueue } from "../state/queue"
import { colors } from "../styles"
import { TrackRating } from "./Rating"

interface TrackTableColumn {
    style: CSSProperties
    render: (track: Track) => ReactNode
}

export type TrackTableColumnKey = "#" | "title" | "artist" | "length" | "rating"

const columns: Record<TrackTableColumnKey, TrackTableColumn> = {
    "#": {
        style: { width: "40px", color: colors.gray5, textAlign: "right" },
        render: track => track.trackNumber,
    },
    title: { style: { width: "340px" }, render: track => track.title },
    artist: {
        style: { width: "240px" },
        render: track => <ArtistCell track={track} />,
    },
    length: {
        style: { width: "70px", color: colors.gray5 },
        render: track => formatTime(track.durationSecs),
    },
    rating: {
        style: { width: "140px" },
        render: track => <RatingCell track={track} />,
    },
}

function RatingCell(props: { track: Track }) {
    const dispatch = useDispatch()
    return (
        <TrackRating
            rating={props.track.rating}
            enabled={props.track.catalogueId !== null}
            onRate={newRating =>
                dispatch(catalogue.setTrackRating({ trackId: props.track.catalogueId!, newRating }))
            }
        />
    )
}

function ArtistCell(props: { track: Track }) {
    const allArtists = useSelector(s => s.catalogue.artists)
    const artistNames = props.track.artistIds.map(a => resolveCanonical(allArtists, a)?.name ?? a)
    return <>{artistNames.join(", ")}</>
}

export const StickyTrackTableHeader = styled.div`
    display: flex;
    border-bottom: 1px solid ${colors.gray2};
    position: sticky;
    top: 0px;
    background: white;
    padding: 8px 0 0;
`

export function TrackTableHeadings(props: { cols: TrackTableColumnKey[] }) {
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

function TableHeading(props: { col: TrackTableColumnKey }) {
    return <TrackTableCell style={columns[props.col].style}>{upperFirst(props.col)}</TrackTableCell>
}

export function TrackTable(props: {
    tracks: Track[]
    cols: TrackTableColumnKey[]
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
    cols: TrackTableColumnKey[]
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

function TrackRowColumn(props: { col: TrackTableColumnKey; track: Track }) {
    const col = columns[props.col]
    return <TrackTableCell style={col.style}>{col.render(props.track)}</TrackTableCell>
}

const TrackFlex = styled.div`
    display: flex;
    align-items: center;
    padding: 2px 0 3px;
    border-radius: 6px;
    &:last-child {
        border-bottom: 0;
    }
    &:hover {
        background: ${colors.gray1};
    }
`

const SelectedTrackFlex = styled(TrackFlex)`
    background: ${colors.purple1};
    &:hover {
        background: ${colors.purple2};
    }
`
const TrackTableCell = styled.div`padding-right: 20px;`
