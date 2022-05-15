import { css } from "linaria"
import { styled } from "linaria/lib/react"
import { upperFirst } from "lodash"
import React, { CSSProperties, ReactNode } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Track } from "../../model"
import { DotDotDot, Row, Subheading } from "../elements"
import { Date } from "../elements/dates"
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

export type TrackTableColumnKey = "#" | "title" | "artist" | "length" | "rating" | "saved"

const columns: Record<TrackTableColumnKey, TrackTableColumn> = {
    "#": {
        style: { width: "40px", color: colors.gray5, textAlign: "right" },
        render: track => track.trackNumber,
    },
    title: { style: { width: "340px" }, render: track => <DotDotDot>{track.title}</DotDotDot> },
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
    saved: {
        style: { color: colors.gray5 },
        render: track => <Date time={track.savedTimestamp} />,
    },
}

function RatingCell(props: { track: Track }) {
    const dispatch = useDispatch()
    return (
        <TrackRating
            rating={props.track.rating}
            enabled={props.track.cataloguedTimestamp !== undefined}
            onRate={newRating => dispatch(catalogue.setTrackRating({ trackId: props.track.id, newRating }))}
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
    /* needed for top of page spacing when sticky */
    padding-top: 16px;
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
    buildTrackQueue: (i: number) => AudioQueue
}) {
    const dispatch = useDispatch()
    return (
        <div className={css`width: 100%; padding: 10px 0;`}>
            {props.tracks.map((track, i) => (
                <TrackRow
                    cols={props.cols}
                    key={track.id}
                    track={track}
                    play={() => dispatch(audio.play(props.buildTrackQueue(i)))}
                />
            ))}
        </div>
    )
}

function TrackRow(props: { track: Track; cols: TrackTableColumnKey[]; play: () => void }) {
    const dispatch = useDispatch()

    const trackId = props.track.id
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
                onMouseDown={e => {
                    if (e.button === 0 || e.button === 2) dispatch(view.selectedTrackChanged(trackId))
                }}
                onDoubleClick={() => props.play()}
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
