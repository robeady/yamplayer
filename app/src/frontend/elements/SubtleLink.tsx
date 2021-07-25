import { styled } from "linaria/lib/react"
import { Link } from "react-router-dom"

export const SubtleLink = styled(Link)`
    color: inherit;
    text-decoration: inherit;
    &:hover {
        text-decoration: underline;
    }
`
