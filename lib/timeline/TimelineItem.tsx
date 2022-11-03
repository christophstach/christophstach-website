import { PropsWithChildren } from 'react'

export default function TimelineItem(props: PropsWithChildren) {
  const { children } = props

  return <li className="mb-10 mx-12">{children}</li>
}
