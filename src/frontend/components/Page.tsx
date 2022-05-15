import { css } from "linaria"
import React, { ReactNode } from "react"
import { colors } from "../styles"

export function Page(props: { title?: ReactNode; children: ReactNode }) {
    return (
        <div className={css`padding: 16px 24px;`}>
            {props.title && <PageTitle>{props.title}</PageTitle>}
            {props.children}
        </div>
    )
}

function PageTitle(props: { children: ReactNode }) {
    return (
        <h1 className={css`margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid ${colors.gray3};`}>
            {props.children}
        </h1>
    )
}
