const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "android/**",
      "ios/**",
      "dist/**",
      "work/**",
      "backend/**",
      "node_modules/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);
