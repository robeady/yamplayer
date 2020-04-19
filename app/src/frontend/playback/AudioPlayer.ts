import { Howl } from "howler"
import { Dict } from "../util/types"
import { idSequence } from "../util/ids"
import { forEach } from "lodash"

type AudioPlayerEvent = { type: "trackEnded" }
type EventCallback = (event: AudioPlayerEvent) => void

export class AudioPlayer {
    queue: Uint8Array[] = []
    howl: Howl | null = null

    eventSubscribers: Dict<EventCallback> = {}
    nextEventSubscriberId = idSequence()

    constructor(public volume: number) {}

    subscribe(callback: EventCallback) {
        const id = this.nextEventSubscriberId()
        this.eventSubscribers[id] = callback
        return id
    }

    unsubscribe(subscriptionId: string) {
        delete this.eventSubscribers[subscriptionId]
    }

    /** Play a track, replacing the existing queue */
    play(trackData: Uint8Array) {
        this.queue = [trackData]
        this.playNextFromQueue()
    }

    /** Enqueue a track to play at the end of the current queue */
    enqueue(trackData: Uint8Array) {
        if (this.howl) {
            this.queue.push(trackData)
        } else {
            this.play(trackData)
        }
    }

    /** Pauses playback and returns true, or if nothing is playing does nothing and returns false */
    pause(): boolean {
        if (this.howl) {
            this.howl.pause()
            return true
        } else {
            return false
        }
    }

    /** Resumes playback and returns true, or if nothing is playing does nothing and returns false */
    unpause() {
        if (this.howl) {
            this.howl.play()
            return true
        } else {
            return false
        }
    }

    skipNext() {
        this.playNextFromQueue()
    }

    /** Seeks the playing track to the given offset in seconds and returns true,
     * or if nothing is playing does nothing and returns false */
    seekTo(offsetSecs: number) {
        if (this.howl) {
            this.howl.seek(offsetSecs)
            return true
        } else {
            return false
        }
    }

    setVolume(volume: number) {
        this.howl?.volume(volume)
        this.volume = volume
    }

    private createHowlAndPlay(trackData: Uint8Array): Howl {
        const blob = new Blob([trackData])
        const url = URL.createObjectURL(blob)
        const howl = new Howl({
            src: url,
            format: "flac",
            volume: this.volume,
            autoplay: true,
            onloaderror: (id, e) => console.error(e),
            onplayerror: (id, e) => console.error(e),
            onend: () => {
                this.playNextFromQueue()
                // TODO: why does it think the callback can be undefined
                forEach(this.eventSubscribers, cb => cb!({ type: "trackEnded" }))
            },
        })
        return howl
    }

    private playNextFromQueue() {
        this.howl?.unload()
        const nextTrackData = this.queue.shift()
        if (nextTrackData) {
            this.howl = this.createHowlAndPlay(nextTrackData)
        }
    }
}
