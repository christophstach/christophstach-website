import { PropsWithChildren } from 'react'

export default function TimelineButton(props: PropsWithChildren) {
  const { children } = props

  return (
    <button
      type="button"
      className="inline-flex items-center rounded-lg border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-emerald-700 focus:z-10 focus:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
    >
      {children}
    </button>
  )
}
