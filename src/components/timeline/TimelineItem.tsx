import { ParentProps } from 'solid-js'

export default function TimelineItem(props: ParentProps) {
  return <li class="mx-12 mb-10">{props.children}</li>
}
