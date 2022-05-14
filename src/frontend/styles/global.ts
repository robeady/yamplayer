import { css } from "linaria"
import { colors } from "."

export default css`
    :global() {
        html {
            line-height: 1.4;
            color: ${colors.gray9};
        }
    }
`
