const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                process: "readonly",
                console: "readonly",
                module: "readonly",
                require: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                exports: "writable",
                Intl: "readonly",
                Date: "readonly",
                fetch: "readonly",
                URL: "readonly",
                URLSearchParams: "readonly",
                Promise: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                describe: "readonly",
                it: "readonly",
                test: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                vi: "readonly",
            },
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        },
    },
    {
        ignores: [
            "docs/**",
            "node_modules/**",
            "web/**",
            ".cache/**",
            "package-lock.json",
        ],
    },
];
