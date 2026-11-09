import { ThemeToggle } from "../components/ThemeToggle";
import { getColorMode } from "../lib/color-mode";

// Placeholder until the home page is ported; the toggle sits here until the
// header is.
export default function Home() {
  return (
    <main class="container">
      solid <ThemeToggle initial={getColorMode()} />
    </main>
  );
}
