import React from "react"
import { useSelector } from "react-redux"
import { TrackListByAlbum } from "../components/TrackListByAlbum"

export function NowPlaying() {
    const queue = useSelector(s => s.player.queue)
    const trackIds = [...queue.previous, ...(queue.current === null ? [] : [queue.current]), ...queue.next]
    return <TrackListByAlbum trackIds={trackIds} />
}
