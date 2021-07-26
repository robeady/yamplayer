export function unreachable(arg: never): never {
    throw new Error(`unreachable - ${JSON.stringify(arg)}`)
}
