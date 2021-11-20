export function parseExternalId(externalId: string, service: string): string {
    if (externalId.startsWith(service + ":")) {
        return externalId.slice(service.length + 1)
    } else {
        throw new Error(`${externalId} is not a ${service} ID`)
    }
}
