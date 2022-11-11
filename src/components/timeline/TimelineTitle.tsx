import { ParentProps } from 'solid-js'

export default function TimelineTitle(props: ParentProps) {
  const { children } = props

  return (
    <div class="prose prose-lg prose-emerald mb-1 dark:prose-invert">
      <h3>{children}</h3>
    </div>
  )
}
