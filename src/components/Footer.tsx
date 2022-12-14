import { Link } from "solid-start"

export default function Footer() {
  return (
    <footer class="bg-white p-4 shadow dark:bg-gray-800 md:flex md:items-center md:justify-between md:p-6">
      <span class="text-sm text-gray-500 dark:text-gray-400 sm:text-center">
        © 2022{" "}
        <a href="https://christophstach.me/" class="hover:underline">
          Christoph Stach
        </a>
      </span>
      <ul class="mt-3 flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
        <li>
          <Link href="/contact" class="hover:underline">
            Contact
          </Link>
        </li>
      </ul>
    </footer>
  )
}
