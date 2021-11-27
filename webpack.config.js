const path = require("path")
const webpack = require("webpack")
const merge = require("webpack-merge")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const InjectBodyPlugin = require("inject-body-webpack-plugin").default

const DEV = process.env.NODE_ENV !== "production"

// disable vendor prefixing of linaria css
require("stylis").set({ prefix: false })

/** @type {webpack.Configuration} */
const config = {
    mode: DEV ? "development" : "production",
    entry: "./src/frontend/index",
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
    devtool: DEV ? "eval-source-map" : "source-map",
    plugins: [
        new HtmlWebpackPlugin({
            title: "Yamplayer",
        }),
        new InjectBodyPlugin({
            content: '<main id="app" />',
        }),
        new MiniCssExtractPlugin({
            filename: DEV ? "styles.css" : "styles-[contenthash].css",
        }),
    ],
}

/** @type {webpack.Configuration} */
const devConfig = {
    devServer: {
        proxy: { "/api": `http://localhost:${process.env.YP_PORT}` },
    },
    resolve: { alias: { "react-dom": "@hot-loader/react-dom" } },
    plugins: [new ForkTsCheckerWebpackPlugin(), new webpack.NamedModulesPlugin()],
}

/** @type {webpack.Configuration} */
const prodConfig = {
    output: {
        path: path.resolve(__dirname, "dist", "web"),
        filename: "[name].[contenthash].js",
        // publicPath: "auto",
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "vendor",
                    chunks: "all",
                },
            },
        },
    },
}

module.exports = merge(config, DEV ? devConfig : prodConfig)
