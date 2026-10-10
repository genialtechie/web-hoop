import globals from "globals";
import pluginJs from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Global ignores: must be the only key in this config object, or ESLint's
  // flat config scopes it to just this block's own rules instead of every
  // config below (eslint:recommended would otherwise still lint dist/).
  {
    ignores: ["lib/**/*", "node_modules/**/*", "dist/**/*", "public/**/*"],
  },
  {
    languageOptions: { globals: globals.browser },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": [
        "error",
        {
          arrowParens: "always",
          singleQuote: false,
        },
      ],
    },
  },
  // Apply prettier config last to override any conflicting rules
  pluginJs.configs.recommended,
  prettierConfig,
];
