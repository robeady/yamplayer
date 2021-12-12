export interface AudioQueue {
    /** Track IDs in playback order */
    readonly tracks: string[]
    /** Pointer to current track or len(tracks) at the end of play */
    readonly currentIdx: number
}

export function currentTrack(queue: AudioQueue) {
    return queue.tracks[queue.currentIdx]
}

export function emptyAudioQueue(): AudioQueue {
    return { tracks: [], currentIdx: 0 }
}

export function appendToQueue(existing: AudioQueue, newTracks: string[]): AudioQueue {
    return { tracks: [...existing.tracks, ...newTracks], currentIdx: existing.currentIdx }
}
