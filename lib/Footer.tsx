import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-white p-4 shadow dark:bg-gray-800 md:flex md:items-center md:justify-between md:p-6">
      <span className="text-sm text-gray-500 dark:text-gray-400 sm:text-center">
        © 2022{' '}
        <a href="https://christophstach.me/" className="hover:underline">
          Christoph Stach
        </a>
      </span>
      <ul className="mt-3 flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
        <li>
          <Link href="/contact" className="hover:underline">
            Contact
          </Link>
        </li>
      </ul>
    </footer>
  )
}
