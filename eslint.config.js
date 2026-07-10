// Flat config — ESLint 9+. Scoped to TS source and tests under skills/*/src, skills/*/tests,
// and packages/*/src, packages/*/tests.
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: [
      "skills/*/src/**/*.ts",
      "skills/*/tests/**/*.ts",
      "packages/*/src/**/*.ts",
      "packages/*/tests/**/*.ts",
    ],
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
      "skills/*/scripts/**",
      "skills/*/i18n/**",
      "skills/*/schemas/**",
      "packages/*/scripts/**",
      "scripts/**",
      "**/*.mjs",
      "**/*.js",
    ],
  },
];
