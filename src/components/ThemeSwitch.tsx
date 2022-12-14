import { HiOutlineMoon, HiOutlineSun } from "solid-icons/hi"
import { colorScheme, setColorScheme } from "../root"

export default function ThemeSwitch() {
  function handleToggleTheme() {
    setColorScheme(colorScheme() === "dark" ? "light" : "dark")
  }

  return (
    <button
      type="button"
      class="rounded-lg p-2.5 text-sm text-indigo-700 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
      onClick={handleToggleTheme}
      aria-label="Switch the color scheme"
    >
      <HiOutlineSun class={`h-5 w-5 ${colorScheme() !== "dark" ? "hidden" : ""}`} />
      <HiOutlineMoon class={`h-5 w-5 ${colorScheme() === "dark" ? "hidden" : ""}`} />
    </button>
  )
}
