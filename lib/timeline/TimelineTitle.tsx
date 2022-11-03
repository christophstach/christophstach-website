import { PropsWithChildren } from 'react'

export default function TimelineTitle(props: PropsWithChildren) {
  const { children } = props

  return <h3 className="mb-1 flex items-center text-lg font-semibold text-gray-900 dark:text-white">{children}</h3>
}
