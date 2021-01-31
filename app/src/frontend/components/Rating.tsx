import { css } from "linaria"
import React from "react"
import Rating from "react-rating"
import { Fraction } from "../../util/types"
import Star from "../icons/star_rate.svg"
import { colors } from "../styles"

function CroppedStar(props: { className: string }) {
    return <Star fill="inherit" className={props.className} viewBox={"4 4 16 16"} width={13} height={13} />
}

const rating = css``

export function TrackRating(props: {
    enabled: boolean
    rating: Fraction | null
    onRate: (newRating: number) => void
}) {
    return (
        <div className={rating}>
            {props.enabled && (
                <Rating
                    // TODO: rounding
                    // TODO: find a better component. this one is not controlled so if onRate fails it's not possible to alter the rating
                    initialRating={(props.rating ?? 0) * 5}
                    onChange={newRating => props.onRate(newRating / 5)}
                    emptySymbol={<CroppedStar className={css`fill: hsla(0, 0%, 50%, 20%);`} />}
                    fullSymbol={
                        <CroppedStar
                            className={css`
                                fill: hsla(0, 0%, 50%, 55%);
                                .${rating}:hover & {
                                    fill: ${colors.purple4};
                                }
                            `}
                        />
                    }
                />
            )}
        </div>
    )
}
