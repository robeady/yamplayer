import { styled } from "linaria/react"
import { colors, fontSizes } from "../styles"

export const Flex = styled.div`display: flex; justify-content: space-between;`

export const Row = styled.div`display: flex;`

export const Col = styled.div`display: flex; flex-direction: column;`

export const Subheading = styled.div`
    font-size: ${fontSizes.tableSecondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${colors.grey2};
`

export const Noverflow = styled.div`
    overflow: hidden;
`
export const DotDotDot = styled.div`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`
