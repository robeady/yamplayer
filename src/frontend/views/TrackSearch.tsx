import { Stack, TextInput } from "@mantine/core"
import React, { useEffect, useState } from "react"
import { MdSearch } from "react-icons/md"
import { useDispatch, useSelector } from "react-redux"
import { useHistory, useLocation } from "react-router-dom"
import { TrackListLegacy } from "../components/TrackListLegacy"
import { catalogue } from "../state/actions"

export function TrackSearch() {
    const dispatch = useDispatch()

    const history = useHistory()
    const query = new URLSearchParams(useLocation().search).get("q")

    const [text, setText] = useState<string>()

    const searchResults = useSelector(s => (query ? s.catalogue.searchResultsByQuery[query] : undefined))

    useEffect(() => {
        if (!searchResults && query) void dispatch(catalogue.fetchSearchResults(query))
    }, [dispatch, query, searchResults])
    return (
        <Stack mt="md">
            <TextInput
                size="md"
                placeholder="Search tracks"
                icon={<MdSearch size={24} />}
                sx={{ maxWidth: 500 }}
                value={text ?? query ?? ""}
                onChange={e => setText(e.target.value)}
                onKeyPress={e => {
                    if (e.key === "Enter" && text !== undefined) {
                        history.replace({
                            search: text ? "?" + new URLSearchParams({ q: text }).toString() : undefined,
                        })
                    }
                }}
            />
            <SearchResults trackIds={searchResults ? searchResults.externalTrackIds : []} />
        </Stack>
    )
}

function SearchResults(props: { trackIds: string[] }) {
    return <TrackListLegacy trackIds={props.trackIds} />
}
