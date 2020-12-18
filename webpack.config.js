const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    mode: "production",
    devtool: process.env.NODE_ENV === "dev" ? "source-map" : false,
    entry: {
        hello: "./src/demo/hello.tsx",
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: "ts-loader" },
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js", ".json"],
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "./dist"),
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name].css",
        }),
        new HtmlWebpackPlugin({
            filename: "ignore-this.html",
        }),
        new HtmlWebpackPlugin({
            chunks: ["hello"],
            filename: "hello.html",
            template: "./src/demo/hello.html",
        }),
    ],
};
