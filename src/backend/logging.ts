import { isEmpty, omit } from "lodash"
import type { TransformableInfo } from "logform"
import path from "path"
import { createLogger, format, transports } from "winston"

function formatMessage(info: TransformableInfo) {
    const file = info.file ? ` [${info.file}]` : ""
    let line = `${info.timestamp} ${info.level}:${file} ${info.message}`
    const extraProps = omit(info, "level", "file", "message", "timestamp", "stack")
    if (!isEmpty(extraProps)) {
        line += " "
        line += JSON.stringify(extraProps)
    }
    if (info.stack) {
        line += "\n  "
        line += info.stack
    }
    return line
}

export const rootLogger = createLogger({
    level: "debug",
    transports: [
        new transports.File({
            filename: "logs/app.log",
            format: format.combine(format.timestamp(), format.printf(formatMessage)),
        }),
        ...(process.env.NODE_ENV === "production"
            ? []
            : [
                  new transports.Console({
                      format: format.combine(
                          format.colorize(),
                          format.timestamp({ format: "HH:mm:ss.SSS" }),
                          format.printf(formatMessage),
                      ),
                  }),
              ]),
    ],
})

export function moduleLogger(module: NodeModule) {
    const pathParts = module.filename.split(path.sep)
    const file = pathParts.slice(-2).join(path.sep)
    return rootLogger.child({ file })
}
