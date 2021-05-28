import express from "express"

/**
 * Creates an express handler for serving a remote object.
 *
 * Expected usage: `app.use(basePath, serve(object))`. The object may also be a promise. Assumes that the
 * express instance has json middleware.
 */
export function serve<T>(object: T) {
    return express.Router().post("/:method", async (req, res) => {
        const target = object as any
        const method = req.params.method!
        const args = req.body as unknown[]
        const timerId = `/${method}#${invocationCounter++}`
        console.time(timerId)
        try {
            if (method in target) {
                // TODO: `func` might not return a promise. is this a performance issue?
                const result = await target[method](...args)
                res.status(result === undefined ? 204 : 200).json(result)
            } else {
                res.status(404).json(`method ${method} not found`)
            }
        } catch (error: any) {
            // on async handlers express won't do any error handling by default,
            // let's take care of it ourselves.
            console.error(error)
            res.status(500).json(`${error?.name || "Error"}: ${error?.message || JSON.stringify(error)}`)
        } finally {
            console.timeEnd(timerId)
        }
    })
}

let invocationCounter = 0
