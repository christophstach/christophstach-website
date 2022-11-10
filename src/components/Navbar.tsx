import { For } from 'solid-js'
import { A } from 'solid-start'
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

  return (
    <nav class="fixed top-0 left-0 z-20 flex h-20 w-full items-center border-b border-gray-300 bg-white/30 px-2 py-2.5 backdrop-blur dark:border-gray-600 dark:bg-gray-900/30 sm:px-4">
      <div class="container mx-auto flex flex-wrap items-center justify-between">
        <Brand />

        <div class="hidden w-full items-center justify-between md:flex md:w-auto">
          <ul class="flex flex-row gap-10 md:text-sm md:font-medium">
            <For each={links}>
              {(link) => {
                return (
                  <li>
                    <A
                      end={true}
                      href={link.href}
                      activeClass="block rounded py-2 pr-4 pl-3 text-emerald-700 dark:text-white"
                      inactiveClass="block rounded py-2 pr-4 pl-3 text-gray-700 hover:bg-gray-100 hover:text-emerald-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                    >
                      {link.text}
                    </A>
                  </li>
                )
              }}
            </For>
          </ul>
        </div>

        <div>
          <ThemeSwitch />
        </div>
      </div>
    </nav>
  )
}