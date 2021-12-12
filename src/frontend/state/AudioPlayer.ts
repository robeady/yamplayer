import produce from "@reduxjs/toolkit/node_modules/immer"
import { Howl } from "howler"
import { player, PlayerAction } from "./actions"
import { appendToQueue, AudioQueue, emptyAudioQueue } from "./queue"

const HOWL_VOLUME_RATIO = 0.25

export class AudioPlayer {
    queue: AudioQueue = emptyAudioQueue()
    playback?:
        | { state: "underway"; howl: Howl; howlSoundId: number; trackId: string }
        | { state: "loading"; promise: Promise<unknown>; trackId: string }
    volume: number
    muted = false
    /**
     * A counter to keep track of track loads, so that if the user skips while we're still loading a track,
     * then once that track is loaded we will discard the result.
     */
    load = 0

    constructor(
        initialVolume: number,
        private loadTrack: (trackId: string) => Promise<Uint8Array>,
        private emitEvent: (action: PlayerAction) => void,
    ) {
        this.volume = initialVolume
    }

    get howl() {
        return this.playback?.state === "underway" ? this.playback.howl : undefined
    }

    /** Play tracks, replacing or updating the existing queue */
    play(queue: AudioQueue | ((oldQueue: AudioQueue) => AudioQueue)) {
        const oldQueue = this.queue
        this.queue = typeof queue === "function" ? queue(this.queue) : queue
        if (oldQueue !== this.queue) {
            this.emitEvent(player.queueChanged(this.queue))
            this.syncSoundWithQueue()
        }
    }

    /** Enqueue tracks to play at the end of the current queue */
    playLater(trackIds: string[]) {
        this.play(q => appendToQueue(q, trackIds))
    }

    /** Pauses playback and returns the position in secs at which playback is paused, unless not playing */
    pause() {
        if (this.playback?.state === "underway" && this.playback.howl.playing(this.playback.howlSoundId)) {
            this.playback.howl.pause(this.playback.howlSoundId)
            const position = this.playback.howl.seek() as number
            this.emitEvent(player.playbackPaused(position))
            return position
        }
    }

    /** Resumes playback and returns the position in secs at which playback resumed from, unless not playing */
    unpause() {
        if (this.playback?.state === "underway" && !this.playback.howl.playing(this.playback.howlSoundId)) {
            const position = this.playback.howl.seek() as number
            this.playback.howl.play(this.playback.howlSoundId)
            this.emitEvent(
                player.playbackResumed({
                    sinceMillis: performance.now(),
                    positionAtTimestamp: position,
                }),
            )
            return position
        }
    }

    /** Skips to the next track in the queue */
    skipNext() {
        if (this.queue.currentIdx < this.queue.tracks.length) {
            this.play(produce(q => void q.currentIdx++))
        }
    }

    skipBack() {
        const positionSecs = this.positionSecs()
        if ((positionSecs !== undefined && positionSecs > 3) || this.queue.currentIdx <= 0) {
            this.seekTo(0)
        } else {
            this.play(produce(q => void q.currentIdx--))
        }
    }

    /** Gets the position in seconds from the start of the current track */
    positionSecs() {
        return this.playback && (this.howl?.seek() as number)
    }

    /** Seeks the playing track to the given offset in seconds */
    seekTo(offsetSecs: number) {
        if (this.playback?.state === "underway") {
            this.playback.howl.seek(offsetSecs, this.playback.howlSoundId)
            const now = performance.now()
            this.emitEvent(
                this.playback.howl.playing(this.playback.howlSoundId)
                    ? player.playbackResumed({
                          sinceMillis: now,
                          positionAtTimestamp: offsetSecs,
                      })
                    : player.playbackPaused(offsetSecs),
            )
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

    private createHowlAndPlay(trackData: Uint8Array): { howl: Howl; howlSoundId: number } {
        const blob = new Blob([trackData])
        const url = URL.createObjectURL(blob)
        const howl = new Howl({
            src: url,
            format: "flac",
            volume: this.volume * HOWL_VOLUME_RATIO,
            mute: this.muted,
            autoplay: false,
            // TODO: on error skip next
            // hmm. when skipping a playing song (and calling howl.unload) we often seem to get onloaderror messages of the form 'Decoding audio data failed.'
            onloaderror: (id, e) => console.error(e),
            onplayerror: (id, e) => console.error(e),
            onend: () => this.skipNext(),
        })
        const howlSoundId = howl.play()
        return { howl, howlSoundId }
    }

    private syncSoundWithQueue() {
        const desiredTrackId = this.queue.tracks[this.queue.currentIdx]

        if (desiredTrackId === this.playback?.trackId) {
            return
        }

        if (this.playback?.state === "underway") {
            this.playback.howl.unload()
        }

        if (desiredTrackId === undefined) {
            this.playback = undefined
            this.emitEvent(player.playbackStopped())
        } else {
            const promise = this.loadTrack(desiredTrackId)
                .then(trackData => {
                    if (this.playback?.state === "loading" && this.playback.promise === promise) {
                        this.playback = {
                            ...this.createHowlAndPlay(trackData),
                            state: "underway",
                            trackId: desiredTrackId,
                        }
                        this.emitEvent(
                            player.playbackResumed({
                                sinceMillis: performance.now(),
                                positionAtTimestamp: 0,
                            }),
                        )
                    }
                })
                .catch(error => {
                    console.error(`error loading track ${desiredTrackId}`, error)
                    this.skipNext()
                })
            this.emitEvent(player.playbackLoading())
            this.playback = { state: "loading", promise, trackId: desiredTrackId }
        }
    }
}
