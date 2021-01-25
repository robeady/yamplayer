import { css } from "linaria"
import React, { PropsWithChildren } from "react"
import { NavLink } from "react-router-dom"
import { Flex } from "../elements"
import PlayArrow from "../icons/play_arrow.svg"
import { colors, fontSizes } from "../styles"

export function LeftNav() {
    return (
        <nav
            className={css`
                width: 200px;
                padding: 24px 0 0 16px;
                border-right: 1px solid gainsboro;
            `}>
            <NavSection title="Explore">
                <NavItem link="/now-playing" text="Now Playing" />
                <NavItem link="/search" text="Search" />
            </NavSection>
            <NavSection title="Library">
                <NavItem link="/library/tracks" text="Library Tracks" />
                <NavItem link="/import" text="Import" />
            </NavSection>
            <NavSection title="Playlists">
                <NavItem link="/playlists/1" text="Playlist" />
            </NavSection>
        </nav>
    )
}

function NavSection(props: PropsWithChildren<{ title: string }>) {
    return (
        <div className={css`padding-bottom: 16px;`}>
            <div
                className={css`
                    text-transform: uppercase;
                    color: ${colors.greyText};
                    font-size: ${fontSizes.tableSecondary};
                    padding-bottom: 8px;
                `}>
                {props.title}
            </div>
            {props.children}
        </div>
    )
}

function NavItem(props: { link: string; text: string }) {
    // TODO icon
    return (
        <NavLink
            to={props.link}
            className={css`
                display: block;
                text-decoration: none;
                color: ${colors.base};
                flex: 1;
                svg {
                    color: ${colors.baseIcon};
                }
            `}
            activeClassName={css`
                color: ${colors.primaryText};
                border-right: 5px solid ${colors.primary};
                svg {
                    color: ${colors.primary};
                }
            `}>
            <Flex className={css`gap: 4px;`}>
                <PlayArrow />
                {props.text}
            </Flex>
        </NavLink>
    )
}
