import React from "react"
import { useSelector } from "react-redux"
import { TrackListByAlbum } from "../components/TrackListByAlbum"

export function NowPlaying() {
    const queue = useSelector(s => s.player.queue)
    return <TrackListByAlbum trackIds={queue.shuffledTracks} />
}
