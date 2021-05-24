import { VirtualElement } from "@popperjs/core"
import { styled } from "linaria/lib/react"
import React, { MouseEvent, ReactNode, useEffect, useRef, useState } from "react"
import { usePopper } from "react-popper"
import { colors, shadows } from "../styles"

export interface Position {
    x: number
    y: number
}

interface DropdownState {
    popperState: ReturnType<typeof usePopper>
    setContainerElement: (e: HTMLElement | null) => void
    open: boolean
    close: () => void
}

export function DropdownMenu(props: { state: DropdownState; children: ReactNode }) {
    const { open, close, setContainerElement, popperState } = props.state
    console.log("open?", open)
    return open ? (
        <Backdrop onMouseDown={close}>
            <PopupContainer
                onClick={close}
                ref={setContainerElement}
                style={popperState.styles.popper}
                {...popperState.attributes.popper}>
                {props.children}
            </PopupContainer>
        </Backdrop>
    ) : null
}

export function useDropdownMenu() {
    const [anchor, setAnchor] = useState<Element | null>(null)
    const [menuOpen, setMenuOpen] = useState<boolean>(false)
    const positionRef = useRef<VirtualElement>()
    const [containerElement, setContainerElement] = useState<HTMLElement | null>(null)

    const popperState = usePopper(menuOpen ? anchor ?? positionRef.current : undefined, containerElement, {
        strategy: "fixed",
        placement: "bottom-start",
        modifiers: [{ name: "preventOverflow" }, { name: "flip " }],
    })

    const close = () => {
        setMenuOpen(false)
    }

    useEffect(() => {
        window.addEventListener("blur", close)
        return () => window.removeEventListener("blur", close)
    }, [])

    return {
        setAnchor,
        show: (e?: MouseEvent) => {
            if (e) {
                const x = e.clientX
                const y = e.clientY
                e.preventDefault()
                positionRef.current = {
                    getBoundingClientRect: () => ({
                        width: 0,
                        height: 0,
                        top: y,
                        bottom: y,
                        left: x,
                        right: x,
                    }),
                }
            }
            setMenuOpen(true)
        },
        state: {
            popperState,
            setContainerElement: (e: HTMLElement | null) => {
                if (e !== null) {
                    console.log("container element set", e)
                    setContainerElement(e)
                }
            },
            open: !!menuOpen,
            close,
        },
    }
}

const Backdrop = styled.div`
    position: fixed;
    z-index: 10000;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
`

const PopupContainer = styled.div`
    background: white;
    border: 1px solid ${colors.gray2};
    min-width: 200px;
    box-shadow: ${shadows.small};
`

export const DropdownMenuItem = styled.div`
    padding: 8px 16px;
    font-size: 13px;
    &:hover {
        background: ${colors.gray1};
    }
`
