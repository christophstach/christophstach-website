import { PropsWithChildren } from 'react'

export interface ButtonProps extends PropsWithChildren {
  type?: 'button' | 'submit' | 'reset'
}

export default function Button(props: ButtonProps) {
  const {type = 'button', children } = props


  return (
    <button
      type={type}
      className="bg-cyan-700 hover:bg-cyan-800 focus:ring-cyan-300 dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:focus:ring-cyan-800 text-white rounded-lg px-5 py-2.5 text-sm font-medium focus:outline-none focus:ring-4"
    >
      {children}
    </button>
  )
}
