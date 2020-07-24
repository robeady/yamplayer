import { Library } from "./library"
import { DeezerApiClient } from "./deezer/gateway"
import { AssocArray } from "../util/types"
import { Album, Track, Artist, SearchResults } from "../model"

export interface LibraryContents {
    tracks: AssocArray<Track>
    albums: AssocArray<Album>
    artists: AssocArray<Artist>
}

export class MusicManager {
    constructor(private library: Library, private deezerClient: DeezerApiClient) {}

    async getLibrary(): Promise<LibraryContents> {
        return this.library.list()
    }

    async searchTracks(query: string): Promise<SearchResults> {
        const results = await this.deezerClient.searchTracks(query)
        return this.library.match(results)
    }
}
