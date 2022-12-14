import { ParentProps } from "solid-js"

export default function Alert(props: ParentProps) {
  return <div class="rounded-md bg-green-200 p-5 text-sm text-green-900">{props.children}</div>
}
