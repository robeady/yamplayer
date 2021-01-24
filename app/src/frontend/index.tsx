import "core-js/stable"
import * as React from "react"
import { render } from "react-dom"
import App from "./App"

// don't reorder these
require("sanitize.css/evergreen.css")
require("sanitize.css/forms.evergreen.css")
require("sanitize.css/assets.css")
require("sanitize.css/typography.css")
require("./styles/global")

render(<App />, document.getElementById("app"))
