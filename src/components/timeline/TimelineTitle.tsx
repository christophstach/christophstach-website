import { ParentProps } from 'solid-js'

export default function TimelineTitle(props: ParentProps) {
  const { children } = props

  return <h3 class="mb-1 text-lg font-semibold text-black dark:text-white">{children}</h3>
}
