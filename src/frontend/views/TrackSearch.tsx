import React, { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { TrackListLegacy } from "../components/TrackListLegacy"
import { catalogue } from "../state/actions"

export function TrackSearch() {
    const dispatch = useDispatch()
    const [searchQuery, setSearchQuery] = useState("")
    const searchResults = useSelector(s =>
        searchQuery ? s.catalogue.searchResultsByQuery[searchQuery] : undefined,
    )
    useEffect(() => {
        if (searchResults === undefined && searchQuery) {
            void dispatch(catalogue.fetchSearchResults(searchQuery))
        }
    }, [dispatch, searchQuery, searchResults])
    return (
        <div>
            <SearchBox onSubmit={setSearchQuery} />
            <SearchResults trackIds={searchResults ? searchResults.externalTrackIds : []} />
        </div>
    )
}

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
    return <TrackListLegacy trackIds={props.trackIds} />
}