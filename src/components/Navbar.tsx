import * as dialog from '@zag-js/dialog'
import { normalizeProps, useMachine } from '@zag-js/solid'
import { HiOutlineMenu, HiOutlineX } from 'solid-icons/hi'
import { createMemo, createUniqueId, For, Show } from 'solid-js'
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

  const [state, send] = useMachine(dialog.machine({ id: createUniqueId(), preventScroll: false, trapFocus: false }))
  const api = createMemo(() => dialog.connect(state, send, normalizeProps))

  return (
    <nav>
      <div class="fixed top-0 left-0 z-20 w-full border-b border-gray-300 bg-white/30 px-4 backdrop-blur dark:border-gray-600 dark:bg-gray-900/30">
        <div class="container mx-auto flex h-20 items-center justify-between">
          <div>
            <Brand />
          </div>
          <div class="hidden md:block">
            <ul class="flex gap-4">
              <For each={links}>
                {(link) => {
                  return (
                    <li>
                      <A
                        end={link.exact}
                        href={link.href}
                        activeClass="block rounded py-2 px-3 text-sm font-medium text-indigo-700 dark:text-white"
                        inactiveClass="block rounded py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-indigo-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
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
            <div class="flex gap-4">
              <div>
                <ThemeSwitch />
              </div>
              <div class='block md:hidden'>
                <button
                  class="rounded-lg p-2.5 text-sm text-indigo-700 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
                  {...api().triggerProps}
                >
                  <Show when={!api().isOpen} fallback={<HiOutlineX class='h-5 w-5' />}>
                  <HiOutlineMenu class="h-5 w-5" />
                  </Show>
                  
                </button>
              </div>
            </div>
          </div>
        </div>

        <Show when={api().isOpen}>
          <div class="container mx-auto">
            <ul class="flex flex-col gap-4 py-4">
              <For each={links}>
                {(link) => {
                  return (
                    <li>
                      <A
                        end={link.exact}
                        href={link.href}
                        onclick={() => {
                          api().close()

                          setTimeout(() => {
                            window.scrollTo({
                              top: 420,
                              behavior: 'smooth',
                            })
                          }, 500)
                        }}
                        activeClass="block rounded text-sm font-medium py-2 px-3 text-indigo-700 dark:text-white"
                        inactiveClass="block rounded text-sm font-medium py-2 px-3 text-gray-700 hover:bg-gray-100 hover:text-indigo-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                      >
                        {link.text}
                      </A>
                    </li>
                  )
                }}
              </For>
            </ul>
          </div>
        </Show>
      </div>
    </nav>
  )
}
