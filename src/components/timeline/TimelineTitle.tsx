import { ParentProps } from "solid-js"

export default function TimelineTitle(props: ParentProps) {
  return (
    <div class="prose prose-lg prose-emerald mb-1 dark:prose-invert">
      <h3>{props.children}</h3>
    </div>
  )
}
