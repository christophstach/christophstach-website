import { Show } from "solid-js"

export interface InputProps {
  name: string
  label?: string
  placeholder?: string
  type?: "textarea" | string
  value?: string
  disabled?: boolean
  required?: boolean
}

export default function Input(props: InputProps) {
  const id = `uuid-${crypto.randomUUID()}`

  return (
    <div>
      <Show when={props.label}>
        <label class="mb-2 block text-sm font-medium" for={id}>
          {props.label}
        </label>
      </Show>

      <Show
        when={props.type === "textarea"}
        fallback={
          <input
            class="dark:focus:border-brand-200 dark:focus:ring-brand-200 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:disabled:bg-gray-500"
            id={id}
            type={props.type}
            name={props.name}
            value={props.value ? props.value : ""}
            placeholder={props.placeholder ? props.placeholder : ""}
            required={props.required}
          />
        }
      >
        <textarea
          rows="3"
          class="dark:focus:border-brand-200 dark:focus:ring-brand-200 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:disabled:bg-gray-500"
          id={id}
          name={props.name}
          value={props.value ? props.value : ""}
          placeholder={props.placeholder ? props.placeholder : ""}
        />
      </Show>
    </div>
  )
}
