import { Stack, TextInput } from "@mantine/core"
import React, { useEffect, useState } from "react"
import { MdSearch } from "react-icons/md"
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
        <Stack mt="md">
            <SearchBox onSubmit={setSearchQuery} />
            <SearchResults trackIds={searchResults ? searchResults.externalTrackIds : []} />
        </Stack>
    )
}

function SearchBox(props: { onSubmit: (text: string) => void }) {
    const [text, setText] = useState("")

    return (
        <TextInput
            size="md"
            placeholder="Search tracks"
            icon={<MdSearch size={24} />}
            sx={{ maxWidth: 500 }}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyPress={e => {
                if (e.key === "Enter") props.onSubmit(text)
            }}
        />
    )
}

function SearchResults(props: { trackIds: string[] }) {
    return <TrackListLegacy trackIds={props.trackIds} />
}
