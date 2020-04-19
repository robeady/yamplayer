declare module "linaria" {
    type CSSProperties = {
        [key: string]: string | number | CSSProperties
    }

    export function css(
        strings: TemplateStringsArray,
        // template expression can also be a styled component
        ...exprs: Array<string | number | CSSProperties | import("linaria/react").StyledComponent<unknown>>
    ): string

    export function cx(...classNames: Array<string | false | undefined | null | 0>): string
}
