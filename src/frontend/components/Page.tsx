import { css } from "linaria"
import React, { ReactNode } from "react"
import { Flex } from "../elements"
import { colors } from "../styles"

export function Page(props: { title?: string; side?: ReactNode; children: ReactNode }) {
    return (
        <div className={css`padding: 16px 24px;`}>
            {(props.title || props.side) && (
                <Flex
                    className={css`
                        margin-bottom: 32px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid ${colors.gray3};
                        align-items: center;
                    `}>
                    <h1 className={css`margin: 0;`}>{props.title}</h1>
                    {props.side}
                </Flex>
            )}
            {props.children}
        </div>
    )
}
