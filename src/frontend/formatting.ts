export function formatTime(totalSecs: number | null): string | null {
    if (totalSecs === null) return null
    const totalSeconds = Math.round(totalSecs)
    const mins = Math.floor(totalSeconds / 60)
    const secs = (totalSeconds % 60).toString().padStart(2, "0")
    return `${mins}:${secs}`
}
