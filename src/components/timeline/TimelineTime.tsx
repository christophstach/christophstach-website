import { ParentProps } from 'solid-js'

export default function TimelineTime(props: ParentProps) {
  return (
    <time class="mb-2 block text-sm font-normal leading-none text-gray-600 dark:text-gray-400">{props.children}</time>
  )
}
