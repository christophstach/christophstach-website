import { PropsWithChildren } from 'react'

export default function TimelineContent(props: PropsWithChildren) {
  const { children } = props

  return <div className="mb-4">{children}</div>
}
