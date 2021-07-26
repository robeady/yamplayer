export interface AudioQueue {
    /** The currently playing (or paused) track ID */
    current: string | null
    /**
     * Track IDs that have finished playing, with most recent last. Note that this is not the same as the
     * playback history because if the user skips backwards, the relevant tracks will move from `previous`
     * into `current` or `next`
     */
    previous: string[]
    /** Track IDs up next, with soonest first */
    next: string[]
}

export function emptyAudioQueue(): AudioQueue {
    return { current: null, previous: [], next: [] }
}

/**
 * Builds an audio queue containing the given list of track IDs, but where `nextTrackId` is up next. Current
 * will be set to null. This is useful to start playing a particular track in the middle of a list
 */
export function buildAudioQueue(allTrackIds: string[], nextTrackId: string): AudioQueue {
    const previous: string[] = []
    const next: string[] = []
    let destination = previous
    for (const trackId of allTrackIds) {
        if (trackId === nextTrackId) {
            destination = next
        }
        destination.push(trackId)
    }
    if (next.length === 0) {
        throw new Error(`track ID ${nextTrackId} not found in [${allTrackIds}]`)
    }
    return { previous, current: null, next }
}
