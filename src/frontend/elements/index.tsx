import { css } from "linaria"
import { styled } from "linaria/react"
import React, { ReactNode } from "react"
import { colors, fontSizes } from "../styles"

/** A row of justified items which flexes to fill the available space */
export const Flex = styled.div`display: flex; justify-content: space-between;`

/** A flex row */
export const Row = styled.div`display: flex;`

export const Subheading = styled.div`
    font-size: ${fontSizes.tableSmall};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${colors.gray6};
`

export const Noverflow = styled.div`
    overflow: hidden;
`
export const DotDotDot = styled.div`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

export const Heading = styled.div`
    font-size: ${fontSizes.heading};
`

export function PageTitle(props: { children: ReactNode }) {
    return (
        <h1 className={css`margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid ${colors.gray3};`}>
            {props.children}
        </h1>
    )
}
