import { shuffle } from "lodash"

export interface ShuffledAudioQueue extends AudioQueue {
    readonly shuffledTracks: string[]
}

export interface AudioQueue {
    /** Track IDs in playback order */
    readonly tracks: string[]
    /** Pointer to current track or len(tracks) at the end of play */
    readonly currentIdx: number
}

export function currentTrack(queue: ShuffledAudioQueue) {
    return queue.shuffledTracks[queue.currentIdx]
}

export function emptyAudioQueue(): ShuffledAudioQueue {
    return { tracks: [], shuffledTracks: [], currentIdx: 0 }
}

export function shuffleTracks(tracks: string[], idxOfFirst: number) {
    return idxOfFirst < tracks.length
        ? [tracks[idxOfFirst]!, ...shuffle(tracks.filter((t, i) => i !== idxOfFirst))]
        : shuffle(tracks)
}
