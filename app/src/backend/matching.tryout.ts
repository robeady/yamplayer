import { promises as fs } from "fs"
import { parseItunesLibraryXml } from "../services/apple/itunes"
import { DeezerApiClient } from "../services/deezer"
import { matchItunesLibrary } from "./matching"

async function main() {
    const service = await DeezerApiClient.create({ cacheDirectory: "cache/deezer" })
    const itunesXml = await fs.readFile("C:\\Users\\Rob\\iTunes\\iTunes Library.xml", "utf8")
    const tracksByExternalId = await matchItunesLibrary(parseItunesLibraryXml(itunesXml), service)
    await fs.writeFile("out.json", JSON.stringify(tracksByExternalId))
}

if (require.main === module) void main()
