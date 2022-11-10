import { ParentProps } from 'solid-js'

export interface ButtonProps extends ParentProps {
  type?: 'button' | 'submit' | 'reset'
}

export default function Button(props: ButtonProps) {
  const { type = 'button', children } = props

  return (
    <button
      type={type}
      class="rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-300 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800"
    >
      {children}
    </button>
  )
}
