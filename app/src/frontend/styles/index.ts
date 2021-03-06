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
    /** Filled standalone icons */
    gray5: "#6B7280",
    /** Secondary text, unfilled standalone icons */
    gray6: "#4B5563",
    gray7: "#374151",
    gray8: "#1F2937",
    /** Text base */
    gray9: "#111827",
}

const purples = {
    /** Primary text hover */
    purple2: "hsl(280, 75%, 40%)",
    /** Primary text */
    purple3: "hsl(280, 75%, 50%)",
    /** Primary hover */
    purple4: "hsl(280, 75%, 55%)",
    /** Primary */
    purple5: "hsl(280, 75%, 65%)",
    /** Selected row hover */
    purple8: "hsl(280, 50%, 88%)",
    /** Selected row */
    purple9: "hsl(280, 50%, 93%)",
}

export const colors = {
    ...tailwindCoolGrey,
    ...purples,
}

export const fontSizes = {
    tableContent: "15px",
    tableSecondary: "13.5px",
}
