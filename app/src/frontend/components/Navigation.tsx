import { css } from "linaria"
import React, { PropsWithChildren } from "react"
import { NavLink } from "react-router-dom"
import { Row, Subheading } from "../elements"
import PlayArrow from "../icons/play_arrow.svg"
import { colors } from "../styles"

export function LeftNav() {
    return (
        <nav
            className={css`
                width: 200px;
                padding-top: 24px;
                border-right: 1px solid ${colors.grey8};
                overflow: auto;
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
            <Subheading
                className={css`
                    padding-left: 16px;
                    padding-bottom: 8px;
                `}>
                {props.title}
            </Subheading>
            {props.children}
        </div>
    )
}

function NavItem(props: { link: string; text: string }) {
    // TODO icon per item
    return (
        <NavLink
            to={props.link}
            className={css`
                display: block;
                padding-left: 16px;
                text-decoration: none;
                color: ${colors.grey2};
                flex: 1;
                &:hover {
                    color: ${colors.grey0};
                    svg {
                        color: ${colors.grey2};
                    }
                }
                svg {
                    color: ${colors.grey3};
                }
                border-left: 5px solid transparent;
            `}
            activeClassName={css`
                color: ${colors.purple3};
                border-color: ${colors.purple5};
                svg {
                    color: ${colors.purple5};
                }
                &:hover {
                    color: ${colors.purple2};
                    svg {
                        color: ${colors.purple4};
                    }
                }
            `}>
            <Row className={css`gap: 4px;`}>
                <PlayArrow />
                {props.text}
            </Row>
        </NavLink>
    )
}
