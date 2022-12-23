import { ParentProps } from "solid-js"

export interface SocialLinkProps extends ParentProps {
  href: string
}

export default function SocialLink(props: SocialLinkProps) {
  return (
    <a
      href={props.href}
      target="_blank"
      class="rounded-lg p-2.5 text-sm text-indigo-700 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
    >
      {props.children}
    </a>
  )
}
