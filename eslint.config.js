import globals from "globals";
import pluginJs from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    // Files to ignore
    ignores: ["lib/**/*", "node_modules/**/*", "dist/**/*", "public/**/*"],
    languageOptions: { globals: globals.browser },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": [
        "error",
        {
          arrowParens: "avoid",
          singleQuote: false,
        },
      ],
    },
  },
  // Apply prettier config last to override any conflicting rules
  pluginJs.configs.recommended,
  prettierConfig,
];
