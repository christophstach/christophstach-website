import { defineConfig } from "oxlint";

// oxlint's own categories instead of a hand-picked list: bugs, suspicious
// code and slow patterns. Style is oxfmt's job; the type-safety rules on top
// keep `any` and unchecked casts out.
export default defineConfig({
  plugins: ["typescript", "import", "unicorn", "oxc", "promise", "node"],
  env: { browser: true },
  categories: { correctness: "error", suspicious: "error", perf: "error" },
  rules: {
    eqeqeq: "error",
    "no-console": "error",
    "no-underscore-dangle": ["error", { allow: ["__BUILD_ID__"] }],
    "import/no-unassigned-import": ["error", { allow: ["**/*.css", "server-only", "client-only"] }],
    "typescript/no-explicit-any": "error",
    "typescript/no-unsafe-type-assertion": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
  },
  ignorePatterns: [".vercel", "file-routes.d.ts", "solid-env.d.ts"],
  overrides: [{ files: ["src/server/**"], env: { node: true, browser: false } }],
});
