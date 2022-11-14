import { HiOutlineMenu, HiOutlineX } from 'solid-icons/hi'
import { createSignal, For, Show } from 'solid-js'
import { A } from 'solid-start'
import { NavbarLink } from '../data/navbar-links'
import Brand from './Brand'
import ThemeSwitch from './ThemeSwitch'

export interface NavbarProps {
  links: NavbarLink[]
}

export default function Navbar(props: NavbarProps) {
  const [open, setOpen] = createSignal(false)

  function handleToggleOpen() {
    setOpen(!open())
  }

  return (
    <nav>
      <div class="fixed top-0 left-0 z-20 w-full border-b border-gray-300 bg-white/30 px-4 backdrop-blur dark:border-gray-600 dark:bg-gray-900/30">
        <div class="container mx-auto flex h-20 items-center justify-between">
          <div>
            <Brand />
          </div>
          <div class="hidden md:block">
            <ul class="flex gap-4">
              <For each={props.links}>
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
              <div class="block md:hidden">
                <button
                  class="rounded-lg p-2.5 text-sm text-indigo-700 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
                  type="button"
                  onclick={handleToggleOpen}
                  aria-label="Open the menu"
                >
                  <Show when={open()} fallback={<HiOutlineMenu class="h-5 w-5" />}>
                    <HiOutlineX class="h-5 w-5" />
                  </Show>
                </button>
              </div>
            </div>
          </div>
        </div>

        <Show when={open()}>
          <div class="container mx-auto">
            <ul class="flex flex-col gap-4 py-4">
              <For each={props.links}>
                {(link) => {
                  return (
                    <li>
                      <A
                        end={link.exact}
                        href={link.href}
                        onclick={() => {
                          setOpen(false)

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
