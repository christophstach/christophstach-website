import * as dialog from '@zag-js/dialog'
import { normalizeProps, useMachine } from '@zag-js/solid'
import { HiOutlineMenu, HiOutlineX } from 'solid-icons/hi'
import { createMemo, createUniqueId, For, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { A } from 'solid-start'
import { NavbarLink } from './Navbar'

export interface NavbarDialogProps {
  links: NavbarLink[]
}

export default function NavbarDialog(props: NavbarDialogProps) {
  const { links } = props
  const [state, send] = useMachine(dialog.machine({ id: createUniqueId(), preventScroll: true }))

  const api = createMemo(() => dialog.connect(state, send, normalizeProps))

  return (
    <>
      <button
        {...api().triggerProps}
        class="rounded-lg p-2.5 text-sm text-indigo-700 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
      >
        <HiOutlineMenu class="h-5 w-5" />
      </button>

      <Show when={api().isOpen}>
        <Portal>
          <div {...api().backdropProps} />
          <div {...api().underlayProps} class="absolute top-0 left-0 z-30 w-full items-center">
            <div
              {...api().contentProps}
              class="flex flex-col border-b border-gray-300 bg-white dark:border-gray-600 dark:bg-black"
            >
              <div class="container mx-auto ">
                <div class="flex h-20 flex-col items-end justify-center px-2 py-2.5 ">
                  <button
                    {...api().closeButtonProps}
                    class="rounded-lg p-2.5 text-sm text-indigo-700 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
                  >
                    <HiOutlineX class="h-5 w-5" />
                  </button>
                </div>

                <ul class="flex flex-col gap-4 px-2 py-2.5 text-sm font-medium">
                  <For each={links}>
                    {(link) => {
                      return (
                        <li>
                          <A
                            end={link.exact}
                            href={link.href}
                            onclick={() => {
                              setTimeout(() => {
                                api().close()

                                window.scrollTo({
                                  top: 420,
                                  behavior: 'smooth',
                                })
                              }, 500)
                            }}
                            activeClass="block rounded py-2 pr-4 pl-3 text-indigo-700 dark:text-white"
                            inactiveClass="block rounded py-2 pr-4 pl-3 text-gray-700 hover:bg-gray-100 hover:text-indigo-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                          >
                            {link.text}
                          </A>
                        </li>
                      )
                    }}
                  </For>
                </ul>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  )
}
