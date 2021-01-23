import { css, cx } from "linaria"
import React from "react"
import ReactSlider, { ReactSliderProps } from "react-slider"

const trackClassName = css`
    background: gainsboro;
    height: 6px;
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
    height: 6px;
`
const classNameIfEnabled = css`
    .${trackClassName}-0 {
        background: darkgray;
    }
    &:hover .${trackClassName}-0, &:active .${trackClassName}-0 {
        background: hsl(270, 100%, 70%);
    }
`
const thumbClassName = css`
    background: darkgray;
    .${classNameIfEnabled}:hover &,
    .${classNameIfEnabled}:active & {
        background: hsl(270, 100%, 60%);
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
    if (props.value === null) {
        return <ReactSlider {...sliderProps} className={className} value={0.5} disabled />
    } else {
        return (
            <ReactSlider
                {...sliderProps}
                className={cx(className, classNameIfEnabled)}
                thumbClassName={thumbClassName}
                value={props.value}
                onChange={v => props.onChange(v as number)}
            />
        )
    }
}
