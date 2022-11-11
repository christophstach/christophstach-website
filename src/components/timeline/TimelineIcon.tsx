import { ParentProps } from 'solid-js'

interface TimelineIconProps extends ParentProps {
  current?: boolean
}

export default function TimelineIcon(props: TimelineIconProps) {
  const { children, current } = props

  const colors = current
    ? 'ring-white bg-indigo-200 text-black dark:bg-indigo-800 dark:text-white dark:ring-black'
    : 'ring-white bg-gray-300 text-black dark:bg-gray-800 dark:text-white dark:ring-black '

  return (
    <div class={`absolute -left-5 flex h-10 w-10 items-center justify-center rounded-full p-2 ring-8 ${colors}`}>
      {children}
    </div>
  )
}
