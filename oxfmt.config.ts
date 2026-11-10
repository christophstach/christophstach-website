import { defineConfig } from "oxfmt";

// oxfmt's defaults; it already skips what .gitignore lists. docs/ holds plans
// whose code fences show partial snippets that formatting would break, and the
// two .d.ts files are generated on every dev and build start.
export default defineConfig({
  ignorePatterns: ["docs/**", "file-routes.d.ts", "solid-env.d.ts"],
});
