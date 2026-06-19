// Flat config — ESLint 9+. Scoped to TS source and tests under pm-tasks/*/src and pm-tasks/*/tests.
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["pm-tasks/*/src/**/*.ts", "pm-tasks/*/tests/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: 2022,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^(_|[A-Z]$)",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "no-unused-vars": "off",
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "pm-tasks/*/scripts/**",
      "pm-tasks/*/i18n/**",
      "pm-tasks/*/schemas/**",
      "scripts/**",
      "**/*.mjs",
      "**/*.js",
    ],
  },
];
