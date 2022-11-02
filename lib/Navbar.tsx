'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Brand from './Brand'
import ThemeSwitch from './ThemeSwitch'

export interface NavbarLink {
  href: string
  text: string
  exact?: boolean
}

export interface NavbarProps {
  links?: NavbarLink[]
}

export default function Navbar(props: NavbarProps) {
  const defaultLinks: NavbarLink[] = [
    {
      href: '/',
      text: 'Home',
      exact: true,
    },
    {
      href: '/about-me',
      text: 'About me',
    },
    {
      href: '/curriculum',
      text: 'Curriculum',
    },
    {
      href: '/projects',
      text: 'Projects',
    },
    {
      href: '/contact',
      text: 'Contact',
    },
  ]

  const { links = defaultLinks } = props
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 z-20 flex h-20 w-full items-center border-b border-gray-200 bg-white/30 px-2 py-2.5 backdrop-blur dark:border-gray-600 dark:bg-gray-900/30 sm:px-4">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <Brand />

        <div className="hidden w-full items-center justify-between  md:flex md:w-auto">
          <ul className="flex flex-row gap-10 md:text-sm md:font-medium ">
            {links.map((link, index) => {
              const active = (link.exact && pathname === link.href) || (!link.exact && pathname.includes(link.href))

              return (
                <li key={index}>
                  <Link
                    href={link.href}
                    className={
                      active
                        ? 'block rounded py-2 pr-4 pl-3 dark:text-white text-cyan-700'
                        : 'block rounded py-2 pr-4 pl-3 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white  hover:text-cyan-700 '
                    }
                    aria-current={active ? 'page' : undefined}
                  >
                    {link.text}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <ThemeSwitch />
        </div>
      </div>
    </nav>
  )
}
