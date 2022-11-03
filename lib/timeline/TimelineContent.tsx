import { PropsWithChildren } from 'react'

export default function TimelineContent(props: PropsWithChildren) {
  const { children } = props

  return <div className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">{children}</div>
}
