import { css, cx } from "linaria"
import React from "react"
import ReactSlider, { ReactSliderProps } from "react-slider"
import { colors } from "../styles"

const trackClassName = css`
    background: ${colors.gray2};
    height: 5px;
    &-0 {
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;
    }
    &-1 {
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
    }
`
const className = css`
    height: 5px;
`
const classNameIfEnabled = css`
    .${trackClassName}-0 {
        background: ${colors.purple5};
    }
    &:hover .${trackClassName}-0, &:active .${trackClassName}-0 {
        background: ${colors.purple4};
    }
`
const thumbClassName = css`
    background: ${colors.purple5};
    .${classNameIfEnabled}:hover &,
    .${classNameIfEnabled}:active & {
        background: ${colors.purple4};
    }
    padding: 7px;
    border-radius: 50%;
    top: -4px;
`
const sliderProps: ReactSliderProps = {
    trackClassName,
    min: 0,
    max: 1,
    step: 0.001,
    // given focus and page-up/down, move the slider a sensible distance
    // TODO: fork the slider and add this behaviour on key left/right
    pageFn: s => s * 20,
}

/** Slider with a value from 0 to 1 */
export function Slider(props: { value: number | null; onChange: (value: number) => void }) {
    return props.value === null ? (
        <ReactSlider {...sliderProps} className={className} value={0.5} disabled />
    ) : (
        <ReactSlider
            {...sliderProps}
            className={cx(className, classNameIfEnabled)}
            thumbClassName={thumbClassName}
            value={props.value}
            onChange={v => props.onChange(v as number)}
        />
    )
}
