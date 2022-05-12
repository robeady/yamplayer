// const greys = {
//     /** Text base */
//     grey0: "hsl(230, 5%, 5%)",
//     /** Standalone icons on hover */
//     grey1: "hsl(230, 5%, 25%)",
//     /** Secondary text, Standalone icons */
//     grey2: "hsl(230, 5%, 40%)",
//     /** Icons that go next to text */
//     grey3: "hsl(230, 5%, 50%)",
//     /** Slider selected */
//     grey6: "hsl(230, 5%, 70%)",
//     /** Unused */
//     grey7: "hsl(230, 5%, 80%)",
//     /** Borders, slider background */
//     grey8: "hsl(230, 5%, 90%)",
//     /** Row hover */
//     grey9: "hsl(230, 5%, 95%)",
// }

// hover guides: add 2 for icons

const tailwindCoolGrey = {
    gray0: "#F9FAFB",
    /** Row hover */
    gray1: "#F3F4F6",
    /** Borders, slider background */
    gray2: "#E5E7EB",
    gray3: "#D1D5DB",
    /** Icons next to secondary text */
    gray4: "#9CA3AF",
    /** Filled standalone icons, even less important text */
    gray5: "#6B7280",
    /** Secondary text, unfilled standalone icons */
    gray6: "#4B5563",
    gray7: "#374151",
    gray8: "#1F2937",
    /** Text base */
    gray9: "#111827",
}

const purples = {
    /** Selected row */
    purple1: "hsl(280, 50%, 93%)",
    /** Selected row hover */
    purple2: "hsl(280, 50%, 88%)",
    /** Primary */
    purple5: "hsl(280, 75%, 65%)",
    /** Primary hover */
    purple6: "hsl(280, 75%, 55%)",
    /** Primary text */
    purple7: "hsl(280, 75%, 50%)",
    /** Primary text hover */
    purple8: "hsl(280, 75%, 40%)",
}

export const colors = {
    ...tailwindCoolGrey,
    ...purples,
    link: purples.purple7,
}

export const shadows = {
    // from tailwind https://tailwindcss.com/docs/box-shadow#outer-shadow
    small: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    medium: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
}

export const fontSizes = {
    heading: "32px",
    small: "14px",
    table: "14px",
    tableSmall: "12px",
}
