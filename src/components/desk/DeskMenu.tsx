import { For, createSignal, createUniqueId } from "solid-js";
import { IconDots } from "../icons";
import type { IconProps } from "../icons";
import type { JSX } from "@solidjs/web";
import styles from "./DeskMenu.module.css";

/** One action in the menu; `danger` marks a destructive one. */
interface MenuAction {
  label: string;
  icon: (props: IconProps) => JSX.Element;
  run: () => unknown;
  danger?: boolean;
}

interface DeskMenuProps {
  actions: MenuAction[];
  label?: string;
}

/** A "…" button opening a list of actions, as a popover. */
export function DeskMenu(props: DeskMenuProps) {
  const id = createUniqueId();
  const [position, setPosition] = createSignal({ top: "0px", left: "0px" });
  let button: HTMLButtonElement | undefined;
  let menu: HTMLDivElement | undefined;
  const label = () => props.label ?? "More actions";

  // A popover sits in the top layer and closes on outside clicks and Escape by
  // itself; it only needs placing under its button when it opens.
  function place(event: ToggleEvent) {
    const rect = button?.getBoundingClientRect();

    if (event.newState === "open" && rect !== undefined) {
      setPosition({
        top: `${rect.bottom + 6}px`,
        left: `${Math.max(8, rect.right - (menu?.offsetWidth ?? 0))}px`,
      });
    }
  }

  function choose(action: MenuAction) {
    menu?.hidePopover();
    action.run();
  }

  return (
    <>
      <button
        ref={(element) => {
          button = element;
        }}
        type="button"
        class="icon-button"
        aria-label={label()}
        title={label()}
        popovertarget={id}
      >
        <IconDots size={20} />
      </button>

      <div
        id={id}
        ref={(element) => {
          menu = element;
        }}
        popover
        class={styles.menu}
        style={position()}
        onToggle={place}
      >
        <ul class={styles.menu__list}>
          <For each={props.actions}>
            {(action) => (
              <li>
                <button
                  type="button"
                  class={[
                    styles.menu__item,
                    { [styles["menu__item--danger"] ?? ""]: action.danger === true },
                  ]}
                  onClick={() => {
                    choose(action);
                  }}
                >
                  <action.icon size={16} />
                  {action.label}
                </button>
              </li>
            )}
          </For>
        </ul>
      </div>
    </>
  );
}

export type { MenuAction };
