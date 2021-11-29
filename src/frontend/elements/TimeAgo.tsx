import { formatDistanceToNow, formatRFC7231 } from "date-fns"
import React from "react"
import { Timestamp } from "../../util/types"

export function TimeAgo(props: { time: Timestamp | null | undefined }) {
    if (props.time == null) return null
    const text = formatDistanceToNow(props.time, { addSuffix: true })
    return <span title={formatRFC7231(props.time)}>{text}</span>
}
