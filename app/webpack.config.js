const path = require("path")
const webpack = require("webpack")
const merge = require("webpack-merge")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

const DEV = process.env.NODE_ENV !== "production"

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
                use: [
                    {
                        loader: "babel-loader",
                    },
                    {
                        loader: "linaria/loader",
                        options: {
                            sourceMap: DEV,
                            displayName: DEV,
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            hmr: DEV,
                        },
                    },
                    {
                        loader: "css-loader",
                        options: {
                            sourceMap: DEV,
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            // TODO: something like [contenthash] in PROD. will need some way to link correct filename
            filename: "styles.css",
        }),
    ],
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

module.exports = merge(appConfig, DEV ? developmentConfig : productionConfig)
