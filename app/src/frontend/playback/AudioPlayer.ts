import { Howl } from "howler"

export class AudioPlayer {
    queue: Uint8Array[] = []
    howl: Howl | null = null

    constructor(public volume: number) {}

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
            onend: () => this.playNextFromQueue(),
        })
        return howl
    }

    private playNextFromQueue() {
        this.howl?.unload()
        const nextData = this.queue.shift()
        if (nextData) {
            this.howl = this.createHowlAndPlay(nextData)
        }
    }
}
