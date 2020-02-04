type Promised<T> = T extends (...args: infer U) => infer V
    ? (...args: U) => V extends Promise<infer P> ? V : Promise<V>
    : never

type AllPromised<T> = {
    [P in keyof T]: Promised<T[P]>
}

/**
 * Create a client proxy for a remote object.
 * @param baseUrl the url prefix for this object; must not end in a slash.
 */
export function remote<T>(baseUrl: string): AllPromised<T> {
    return new Proxy(
        {},
        {
            get: (_target, prop, _receiver) => {
                return async (...args: unknown[]) => {
                    const result = await fetch(`${baseUrl}/${prop as string}`, {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(args),
                    })
                    const json = await result.json()
                    if (result.ok) {
                        return json
                    } else {
                        // re-encoding as json is a bit sad but this should be uncommon
                        throw Error(typeof json === "string" ? json : JSON.stringify(json))
                    }
                }
            },
        },
    ) as any
}
