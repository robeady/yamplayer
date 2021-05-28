type Promised<T> = T extends (...args: infer U) => infer V
    ? (...args: U) => V extends Promise<unknown> ? V : Promise<V>
    : never

export type Remote<T> = {
    [P in keyof T]: Promised<T[P]>
}

/**
 * Create a client proxy for a remote object.
 *
 * @param baseUrl   The url prefix for this object; must not end in a slash.
 */
export function remote<T>(baseUrl: string): Remote<T> {
    return new Proxy(
        {},
        {
            get: (target, prop) => {
                if (typeof prop !== "string") {
                    throw new TypeError(
                        "Can only call named functions on remote object. Tried to dereference property " +
                            JSON.stringify(prop),
                    )
                }
                return async (...args: unknown[]) => {
                    const result = await fetch(`${baseUrl}/${prop}`, {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(args),
                    })
                    if (result.status === 204) {
                        return undefined
                    } else if (result.ok) {
                        return result.json()
                    } else {
                        throw new Error(await result.text())
                    }
                }
            },
        },
    ) as any
}
