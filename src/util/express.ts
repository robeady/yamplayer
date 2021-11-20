import type { Express } from "express-serve-static-core"
import type { Server } from "http"
import type { AddressInfo } from "net"

export interface ListeningExpress extends AddressInfo {
    server: Server
}

export async function listen(app: Express, port: number, host: string) {
    return new Promise<ListeningExpress>((resolve, reject) => {
        const server = app.listen(port, host, err => {
            if (err) {
                reject(err)
            } else {
                resolve({ server, ...(server.address() as AddressInfo) })
            }
        })
    })
}
