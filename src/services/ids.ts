export function extractEntityId(externalId: string, service: string): string {
    if (externalId.startsWith(service + ":")) {
        return externalId.slice(service.length + 1)
    } else {
        throw new Error(`${externalId} is not a ${service} ID`)
    }
}

export function parseExternalId(externalId: string): ExternalId {
    const parts = externalId.split(":")
    if (parts.length >= 2) {
        return { service: parts[0]!, entityId: parts[1]! }
    } else {
        throw new Error(`${externalId} is not a valid external ID`)
    }
}

export function splitExternalId(externalId: string): [service: string, entityId: string] {
    const e = parseExternalId(externalId)
    return [e.service, e.entityId]
}

export function isExternalId(id: string) {
    return id.includes(":")
}

export interface ExternalId {
    service: string
    entityId: string
}

export function stringifyExternalId(externalId: ExternalId) {
    return `${externalId.service}:${externalId.entityId}`
}
