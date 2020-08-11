export function parseExternalId(externalId: string, service: string) {
    if (externalId.startsWith(service + ":")) {
        return externalId.substring(service.length + 1)
    } else {
        throw Error(`${externalId} is not a ${service} ID`)
    }
}
