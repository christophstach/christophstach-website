import { mergeProps, ParentProps } from 'solid-js'

export interface ButtonProps extends ParentProps {
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

export default function Button(props: ButtonProps) {
  const propsWithDefaults = mergeProps({ type: 'button' as 'button' | 'submit' | 'reset' }, props)

  return (
    <button
      type={propsWithDefaults.type}
      disabled={propsWithDefaults.disabled}
      class="rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:bg-neutral-300 disabled:text-neutral-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800"
    >
      {props.children}
    </button>
  )
}
