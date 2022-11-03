import { PropsWithChildren } from 'react'

export default function TimelineItem(props: PropsWithChildren) {
  const { children } = props

  return <li className="mx-12 mb-10">{children}</li>
}
