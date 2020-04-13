# thoughts about wrapping state

one possible API

    const trackId = usePlayback().select(s => s.playingTrack.id)
    usePlayback().update(s => s.volume = 0.5)
    const { play, pause } = usePlayback().actions()
    const playCount = useLibrary().queries.playCount(currentTrackId)

but I'm worried by calling usePlayback everywhere which is fetching from a context

alternatively we could embed all the functions.

For state this works fine

    const trackId = Playback.useState(s => s.trackId)
    const update = Playback.useUpdate()
    update(s => s.volume = 0.5)

For actions too, because the update reference and any other props are stable

    const { play, pause } = Playback.useActions()

But queries may be more problematic, in terms of how to define the query functions in a way that they can access extra props like a client instance.
The trouble is, how do we define all these functions when they're supposed to capture props?
Maybe they all have to be defined with an extra props argument / curried, but this is annoying

    // query
    const playCount = Library.usePlayCount(currentTrackId)
