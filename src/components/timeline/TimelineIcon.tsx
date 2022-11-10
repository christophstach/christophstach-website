import { ParentProps } from 'solid-js'

interface TimelineIconProps extends ParentProps {
  current?: boolean
}

export default function TimelineIcon(props: TimelineIconProps) {
  const { children, current } = props

  const colors = current
    ? 'ring-neutral-100 bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 dark:ring-neutral-900'
    : 'ring-neutral-100 bg-gray-300 dark:bg-gray-700 dark:ring-neutral-900 '

  return (
    <div class={`absolute -left-5 flex h-10 w-10 items-center justify-center rounded-full p-2 ring-8 ${colors}`}>
      {children}
    </div>
  )
}
