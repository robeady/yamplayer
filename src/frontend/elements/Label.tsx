import { css, cx } from "linaria"
import React, { ReactNode } from "react"
import { colors } from "../styles"
import { MaxLines } from "./MaxLines"

const labelClass = css`
    line-height: 1.3;
    font-size: 14px;
`

const dimClass = css`
    color: ${colors.gray5};
`

export function Label(props: { className?: string; children: ReactNode; lines?: number; dim?: boolean }) {
    return (
        <MaxLines lines={props.lines ?? 1} className={cx(props.className, labelClass, props.dim && dimClass)}>
            {props.children}
        </MaxLines>
    )
}
