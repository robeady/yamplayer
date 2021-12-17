import { css } from "linaria"
import React, { Dispatch, SetStateAction } from "react"
import { Link } from "react-router-dom"
import { Album, Track } from "../../model"
import { Heading } from "../elements"
import { LinkButton } from "../elements/LinkButton"
import { TrackTable, TrackTableColumnKey, TrackTableHeadings } from "./TrackTable"

const tableCols: TrackTableColumnKey[] = ["#", "title", "artist", "length"]

export function AlbumContents(props: {
    album: Album
    tracks: Track[]
    showingAllTracks: boolean
    setShowingAllTracks: Setter<boolean>
    showHeadings?: boolean
}) {
    return (
        <div className={css`flex: 1;`}>
            <AlbumTitle title={props.album.title} />
            <AlbumArtist />
            {props.showHeadings === true && <TrackTableHeadings cols={tableCols} />}
            <TrackTable
                tracks={props.tracks}
                cols={tableCols}
                buildTrackQueue={i => ({
                    tracks: props.tracks.map(t => t.catalogueId ?? t.externalId),
                    currentIdx: i,
                })}
            />
            {props.album.numTracks === null ||
                ((props.album.numTracks > props.tracks.length || props.showingAllTracks) && (
                    <WholeAlbumToggle
                        showingAllTracks={props.showingAllTracks}
                        setShowingAllTracks={props.setShowingAllTracks}
                    />
                ))}
        </div>
    )
}

type Setter<T> = Dispatch<SetStateAction<T>>

function WholeAlbumToggle(props: { showingAllTracks: boolean; setShowingAllTracks: Setter<boolean> }) {
    return (
        <LinkButton onClick={() => props.setShowingAllTracks(s => !s)}>
            {props.showingAllTracks ? "Show only tracks in library" : "Show whole album"}
        </LinkButton>
    )
}

function AlbumTitle(props: { title: string }) {
    return <Heading>{props.title}</Heading>
}
function AlbumArtist() {
    return (
        <div className={css`padding-bottom: 16px;`}>
            <Link to={`/library/artist/{"catalogueId"}`}>Some Body</Link>
        </div>
    )
}
