import { PropsWithChildren } from 'react'

export default function TimelineTitle(props: PropsWithChildren) {
  const { children } = props

  return <h3 className="mb-1 text-lg font-semibold">{children}</h3>
}
