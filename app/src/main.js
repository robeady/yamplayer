/* eslint-env node */

const { app, BrowserWindow, session } = require("electron")
const path = require("path")

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = true

let mainWindow

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
        },
    })

    mainWindow.loadFile(path.join(__dirname, `frontend/index.${process.env.NODE_ENV}.html`))

    mainWindow.on("closed", () => {
        mainWindow = null
    })

    mainWindow.on("ready-to-show", () => {
        mainWindow.show()
        mainWindow.focus()
    })
}

app.on("ready", () => {
    createWindow()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
    if (mainWindow === null) createWindow()
})

// crazy hack to stop spew of console errors when using network devtools
// see https://github.com/electron/electron/issues/13008#issuecomment-575909942
app.on("ready", () => {
    const redirectURL =
        "data:application/x-javascript;base64,UHJvZHVjdFJlZ2lzdHJ5SW1wbC5SZWdpc3RyeT1jbGFzc3tjb25zdHJ1Y3Rvcigpe31uYW1lRm9yVXJsKHIpe3JldHVybiBudWxsfWVudHJ5Rm9yVXJsKHIpe3JldHVybiBudWxsfXR5cGVGb3JVcmwocil7cmV0dXJuIG51bGx9fSxQcm9kdWN0UmVnaXN0cnlJbXBsLl9oYXNoRm9yRG9tYWluPWZ1bmN0aW9uKHIpe3JldHVybiIifSxQcm9kdWN0UmVnaXN0cnlJbXBsLnJlZ2lzdGVyPWZ1bmN0aW9uKHIsdCl7UHJvZHVjdFJlZ2lzdHJ5SW1wbC5fcHJvZHVjdHNCeURvbWFpbkhhc2g9bmV3IE1hcH0sUHJvZHVjdFJlZ2lzdHJ5SW1wbC5fcHJvZHVjdHNCeURvbWFpbkhhc2g9bmV3IE1hcCxQcm9kdWN0UmVnaXN0cnlJbXBsLnJlZ2lzdGVyKFtdLFtdKSxQcm9kdWN0UmVnaXN0cnlJbXBsLnNoYTE9ZnVuY3Rpb24ocil7cmV0dXJuIiJ9Ow=="
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        if (
            /^devtools:\/\/devtools\/remote\/serve_file\/@[0-9a-f]{40}\/product_registry_impl\/product_registry_impl_module.js$/iu.test(
                details.url,
            )
        ) {
            callback({ redirectURL })
            return
        }
        callback({})
    })
})

// requests to deezer involve setting cookies which we cannot control in the browser
// so we make those requests from the main processes instead.
// global["axios"] = require("axios")
