import { styled } from "linaria/lib/react"

export const MaxLines = styled.div<{ lines: number }>`
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: ${props => props.lines};
    line-clamp: ${props => props.lines};
    -webkit-box-orient: vertical;
`
