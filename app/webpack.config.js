const path = require("path")
const webpack = require("webpack")
const merge = require("webpack-merge")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")

const appConfig = {
    mode: process.env.NODE_ENV || "development",
    entry: ["./src/frontend/index"],
    output: {
        path: path.join(__dirname, "dist"),
        filename: "bundle.js",
    },
    resolve: {
        modules: ["node_modules"],
        extensions: [".ts", ".tsx", ".js", ".jsx"],
    },
    target: "electron-renderer",
    module: {
        rules: [
            {
                test: /\.(j|t)s(x)?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                },
            },
        ],
    },
}

const developmentConfig = {
    output: {
        publicPath: "http://localhost:8180/",
    },
    resolve: {
        alias: {
            "react-dom": "@hot-loader/react-dom",
        },
    },
    plugins: [new ForkTsCheckerWebpackPlugin(), new webpack.NamedModulesPlugin()],
    devtool: "eval-source-map",
}

const productionConfig = {
    output: {
        publicPath: "/",
    },
}

module.exports = merge(appConfig, process.env.NODE_ENV === "production" ? productionConfig : developmentConfig)
