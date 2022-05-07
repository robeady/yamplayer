export function extractExternalId(externalId: string, service: string): string {
    if (externalId.startsWith(service + ":")) {
        return externalId.slice(service.length + 1)
    } else {
        throw new Error(`${externalId} is not a ${service} ID`)
    }
}

export function parseExternalId(externalId: string): ExternalId {
    const parts = externalId.split(":")
    if (parts.length === 2) {
        return { externalService: parts[0]!, externalId: parts[1]! }
    } else {
        throw new Error(`${externalId} is not a valid external ID`)
    }
}

export function splitExternalId(externalId: string): [externalService: string, externalId: string] {
    const e = parseExternalId(externalId)
    return [e.externalService, e.externalId]
}

export function isExternalId(id: string) {
    return id.includes(":")
}

export interface ExternalId {
    externalService: string
    externalId: string
}

export function stringifyExternalId(externalId: ExternalId) {
    return `${externalId.externalService}:${externalId.externalId}`
}
