const path = require("path")
const webpack = require("webpack")
const merge = require("webpack-merge")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

const DEV = process.env.NODE_ENV !== "production"

// disable vendor prefixing of linaria css
require("stylis").set({ prefix: false })

/** @type {webpack.Configuration} */
const config = {
    entry: "./src/frontend/index",
    output: {
        path: path.join(__dirname, "dist"),
        filename: "bundle.js",
    },
    resolve: {
        modules: ["node_modules"],
        extensions: [".ts", ".tsx", ".js", ".jsx"],
    },
    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                exclude: /node_modules/,
                use: [
                    { loader: "babel-loader" },
                    { loader: "linaria/loader", options: { sourceMap: DEV, displayName: DEV } },
                ],
            },
            {
                test: /\.css$/,
                use: [
                    { loader: MiniCssExtractPlugin.loader, options: { hmr: DEV } },
                    { loader: "css-loader", options: { sourceMap: DEV } },
                ],
            },
            {
                test: /\.svg$/,
                use: [
                    { loader: "babel-loader" },
                    {
                        loader: "react-svg-loader",
                        options: { jsx: true, svgo: { plugins: [{ removeViewBox: false }] } },
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

const devConfig = {
    devServer: {
        contentBase: "src/frontend/public",
        proxy: { "/api": `http://localhost:${process.env.YP_PORT}` },
    },
    resolve: { alias: { "react-dom": "@hot-loader/react-dom" } },
    plugins: [new ForkTsCheckerWebpackPlugin(), new webpack.NamedModulesPlugin()],
    devtool: "eval-source-map",
}

const prodConfig = {
    output: {
        publicPath: "/",
    },
}

module.exports = merge(config, DEV ? devConfig : prodConfig)
