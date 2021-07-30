import { styled } from "linaria/lib/react"
import { colors } from "../styles"

export const LinkButton = styled.button`
    border: 0;
    background: none;
    padding: 0;
    color: ${colors.link};
    &:hover {
        text-decoration: underline;
        cursor: pointer;
    }
`
