import React, { useState } from "react"
import { TrackListing } from "./components/TrackListing"
import { useSearchResults } from "./state/library"

function SearchBox(props: { onSubmit: (text: string) => void }) {
    const [text, setText] = useState("")
    return (
        <label>
            Search tracks:{" "}
            <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyPress={e => {
                    if (e.key === "Enter") props.onSubmit(text)
                }}
            />
        </label>
    )
}

function SearchResults(props: { trackIds: string[] }) {
    return <TrackListing trackIds={props.trackIds} />
}

export function TrackSearch() {
    const [searchQuery, setSearchQuery] = useState(null as string | null)
    const searchResults = useSearchResults(searchQuery)
    return (
        <div>
            <SearchBox onSubmit={setSearchQuery} />
            <SearchResults trackIds={searchResults.externalTrackIds} />
        </div>
    )
}
