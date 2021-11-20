import { Howl } from "howler"
import { player, PlayerAction } from "./actions"
import { AudioQueue, emptyAudioQueue } from "./queue"

const HOWL_VOLUME_RATIO = 0.25

export class AudioPlayer {
    queue: AudioQueue = emptyAudioQueue()
    howl: Howl | null = null
    volume: number
    muted = false
    /**
     * A counter to keep track of track loads, so that if the user skips while we're still loading a track,
     * then once that track is loaded we will discard the result.
     */
    load = 0

    constructor(
        initialVolume: number,
        private loadTrack: (trackId: string) => Promise<Uint8Array> | undefined,
        private emitEvent: (action: PlayerAction) => void,
    ) {
        this.volume = initialVolume
    }

    /** Play tracks, replacing the existing queue */
    play({ next = [] as string[], previous = [] as string[] }) {
        this.queue = { current: null, next, previous }
        this.emitEvent(player.queueChanged(this.copyOfQueue()))
        this.playNextFromQueue()
    }

    /** Enqueue tracks to play at the end of the current queue */
    playLater(trackIds: string[]) {
        if (this.howl) {
            this.queue.next.push(...trackIds)
            this.emitEvent(player.queueChanged(this.copyOfQueue()))
        } else {
            this.play({ next: trackIds })
        }
    }

    /**
     * Pauses playback and returns the position in secs at which playback is paused, or if nothing is playing
     * does nothing and returns null
     */
    pause(): number | null {
        if (this.howl) {
            this.howl.pause()
            const position = this.howl.seek() as number
            this.emitEvent(player.playbackPaused(position))
            return position
        } else {
            return null
        }
    }

    /**
     * Resumes playback and returns the position in secs at which playback resumed from, or if nothing is
     * playing does nothing and returns null
     */
    unpause() {
        if (this.howl) {
            const position = this.howl.seek() as number
            this.howl.play()
            this.emitEvent(
                player.playbackResumed({
                    sinceMillis: performance.now(),
                    positionAtTimestamp: position,
                }),
            )
            return position
        } else {
            return null
        }
    }

    /** Skips to the next track in the queue */
    skipNext() {
        this.playNextFromQueue()
    }

    /** Gets the position in seconds from the start of the current track, or null if nothing is playing */
    positionSecs(): number | null {
        return this.howl ? (this.howl.seek() as number) : null
    }

    /**
     * Seeks the playing track to the given offset in seconds and returns the new position, or if nothing is
     * playing does nothing and returns null
     */
    seekTo(offsetSecs: number): number | null {
        if (this.howl) {
            const newPosition = this.howl.seek(offsetSecs) as number
            this.emitEvent(
                this.howl.playing()
                    ? player.playbackResumed({
                          sinceMillis: performance.now(),
                          positionAtTimestamp: newPosition,
                      })
                    : player.playbackPaused(newPosition),
            )
            return newPosition
        } else {
            return null
        }
    }

    /** Set the volume of the player */
    setVolume(volume: number) {
        this.howl?.volume(volume * HOWL_VOLUME_RATIO)
        this.volume = volume
        this.emitEvent(player.volumeChanged({ muted: this.muted, volume }))
    }

    /** Toggle whether the player is muted */
    toggleMute() {
        this.muted = !this.muted
        this.howl?.mute(this.muted)
        this.emitEvent(player.volumeChanged({ muted: this.muted, volume: this.volume }))
    }

    private createHowlAndPlay(trackData: Uint8Array): Howl {
        const blob = new Blob([trackData])
        const url = URL.createObjectURL(blob)
        const howl = new Howl({
            src: url,
            format: "flac",
            volume: this.volume * HOWL_VOLUME_RATIO,
            mute: this.muted,
            autoplay: true,
            // TODO: on error skip next
            // hmm. when skipping a playing song (and calling howl.unload) we often seem to get onloaderror messages of the form 'Decoding audio data failed.'
            onloaderror: (id, e) => console.error(e),
            onplayerror: (id, e) => console.error(e),
            onend: () => this.playNextFromQueue(),
        })
        return howl
    }

    private playNextFromQueue() {
        this.howl?.unload()
        this.howl = null
        const nextTrackId = this.queue.next.shift()
        this.queue.current = nextTrackId ?? null
        this.emitEvent(player.queueChanged(this.copyOfQueue()))
        if (nextTrackId === undefined) {
            this.emitEvent(player.playbackStopped())
        } else {
            const load = ++this.load
            this.emitEvent(player.playbackLoading())
            const promise = this.loadTrack(nextTrackId)
            if (promise === undefined) {
                // unavailable, skip next
                console.error(`error loading track ${nextTrackId}: unknown track`)
                this.playNextFromQueue()
            } else {
                promise
                    .then(trackData => {
                        if (this.load === load) {
                            this.howl = this.createHowlAndPlay(trackData)
                            this.emitEvent(
                                player.playbackResumed({
                                    sinceMillis: performance.now(),
                                    positionAtTimestamp: 0,
                                }),
                            )
                        }
                    })
                    .catch(error => {
                        console.error(`error loading track ${nextTrackId}: ${error}`)
                        this.playNextFromQueue()
                    })
            }
        }
    }

    private copyOfQueue(): AudioQueue {
        return { current: this.queue.current, previous: [...this.queue.previous], next: [...this.queue.next] }
    }
}
