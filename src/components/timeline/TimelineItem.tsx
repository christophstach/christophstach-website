import { ParentProps } from 'solid-js'

export default function TimelineItem(props: ParentProps) {
  const { children } = props

  return <li class="mx-12 mb-10">{children}</li>
}
