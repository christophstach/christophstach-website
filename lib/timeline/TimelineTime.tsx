import { PropsWithChildren } from 'react'

export default function TimelineTime(props: PropsWithChildren) {
  const { children } = props

  return (
    <time className="mb-2 block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">{children}</time>
  )
}
