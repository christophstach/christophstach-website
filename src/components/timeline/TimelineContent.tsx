import { ParentProps } from 'solid-js'

export default function TimelineContent(props: ParentProps) {
  const { children } = props

  return <div class="mb-4">{children}</div>
}
