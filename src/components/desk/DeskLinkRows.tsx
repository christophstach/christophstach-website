import { For, Show } from "solid-js";
import { IconPlus, IconTrash } from "../icons";

/** One editable link: what it's called and where it goes. */
interface LinkRow {
  label: string;
  href: string;
}

interface DeskLinkRowsProps {
  links: LinkRow[];
  onChange: (index: number, key: keyof LinkRow, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  labelPlaceholder: string;
  hrefPlaceholder: string;
  hrefType?: "url" | "text";
  /** The add button's class from the page's module. */
  addClass: string | undefined;
}

/** Editable rows of links, with "Add link". */
export function DeskLinkRows(props: DeskLinkRowsProps) {
  return (
    <>
      <Show when={props.links.length > 0}>
        <ul class="form-rows">
          <For each={props.links}>
            {(link, index) => (
              <li class="link-row">
                <input
                  value={link.label}
                  onInput={(event) => {
                    props.onChange(index(), "label", event.currentTarget.value);
                  }}
                  class="input"
                  placeholder={props.labelPlaceholder}
                  aria-label="Link label"
                  required
                />
                <input
                  value={link.href}
                  onInput={(event) => {
                    props.onChange(index(), "href", event.currentTarget.value);
                  }}
                  class="input link-row__href"
                  type={props.hrefType ?? "text"}
                  placeholder={props.hrefPlaceholder}
                  aria-label="Link address"
                  required
                />
                <button
                  type="button"
                  class="icon-button"
                  aria-label="Remove link"
                  title="Remove link"
                  onClick={() => {
                    props.onRemove(index());
                  }}
                >
                  <IconTrash size={16} />
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <button
        type="button"
        class={["button button--outline", props.addClass]}
        onClick={() => {
          props.onAdd();
        }}
      >
        <IconPlus size={16} />
        Add link
      </button>
    </>
  );
}
