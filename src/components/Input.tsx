import cuid from "cuid"
import { Show } from "solid-js"

export interface InputProps {
  name: string
  label?: string
  placeholder?: string
  type?: "textarea" | string
  value?: string
  disabled?: boolean
}

export default function Input(props: InputProps) {
  const id = cuid()

  return (
    <div>
      <Show when={props.label}>
        <label class="mb-2 block text-sm font-medium text-gray-700" for={id}>
          {props.label}
        </label>
      </Show>

      <Show
        when={props.type === "textarea"}
        fallback={
          <input
            class="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            id={id}
            type={props.type}
            name={props.name}
            value={props.value ? props.value : ""}
            placeholder={props.placeholder ? props.placeholder : ""}
          />
        }
      >
        <textarea
          rows="3"
          class="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          id={id}
          name={props.name}
          value={props.value ? props.value : ""}
          placeholder={props.placeholder ? props.placeholder : ""}
        />
      </Show>
    </div>
  )
}
