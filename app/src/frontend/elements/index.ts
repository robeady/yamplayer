import { styled } from "linaria/react"
import { colors, fontSizes } from "../styles"

export const Flex = styled.div`display: flex;`

export const FlexCol = styled.div`display: flex; flex-direction: column;`

export const Subheading = styled.div`
    font-size: ${fontSizes.tableSecondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${colors.greyText};
`
